import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getWorkspaceSummary,
    getWorkspaces,
    searchWorkspacesNaturalLanguage
} from '../api/workspace';
import { getWorkspaceEvidenceSummary } from '../utils/workspaceEvidence';
import AppHeader from '../components/AppHeader';

const getCleanGradeInfo = (score) => {
    if (score === null || score === undefined) {
        return {
            accentColor: '#8A8A8A',
            color: '#666666',
            softColor: '#F4F4F4',
            borderColor: '#D7D7D7',
            shadowColor: 'rgba(80, 80, 80, 0.18)',
            label: '미정',
            icon: '?',
            description: '평가 데이터가 아직 충분하지 않은 사업장입니다.'
        };
    }

    if (score >= 80) {
        return {
            accentColor: '#009900',
            color: '#08752A',
            softColor: '#EEF9F0',
            borderColor: '#BFE5C8',
            shadowColor: 'rgba(0, 153, 0, 0.20)',
            label: '우수',
            icon: '✓',
            description: '근로 환경 평가가 전반적으로 우수한 사업장입니다.'
        };
    }

    if (score >= 60) {
        return {
            accentColor: '#FFC000',
            color: '#9A6700',
            softColor: '#FFF9E8',
            borderColor: '#F3D98B',
            shadowColor: 'rgba(255, 192, 0, 0.22)',
            label: '보통',
            icon: '―',
            description: '전반적으로 보통 수준이며, 상세 후기를 함께 확인해 주세요.'
        };
    }

    if (score >= 40) {
        return {
            accentColor: '#FF6600',
            color: '#C94F00',
            softColor: '#FFF3EA',
            borderColor: '#F7C7A8',
            shadowColor: 'rgba(255, 102, 0, 0.22)',
            label: '주의',
            icon: '!',
            description: '주의 항목이 있습니다. 근무 전 산출 근거와 후기를 확인하세요.'
        };
    }

    return {
        accentColor: '#DD0000',
        color: '#B30000',
        softColor: '#FFF0F0',
        borderColor: '#F0B6B6',
        shadowColor: 'rgba(221, 0, 0, 0.24)',
        label: '위험',
        icon: '!!',
        description: '위험 신호가 확인되었습니다. 상세 근거를 반드시 확인하세요.'
    };
};

const formatCleanScore = (score) => {
    if (score === null || score === undefined) {
        return '점수 없음';
    }

    return `${score}점`;
};

const shouldFallbackToKeywordSearch = (error) =>
    [502, 503].includes(error?.response?.status);

const coerceFiniteNumber = (value) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
};

const DEFAULT_MAP_CENTER = {
    lat: 35.1764,
    lng: 126.9135
};

const getStoreCoordinates = (store) => {
    const lat = coerceFiniteNumber(store?.latitude);
    const lng = coerceFiniteNumber(store?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
};

const findFirstMappableStore = (items) =>
    items.find((item) => getStoreCoordinates(item)) || null;

const buildInterpretedSearchChips = (
    interpreted
) => {
    if (!interpreted || typeof interpreted !== 'object') {
        return [];
    }

    const chips = [];

    if (interpreted.district) {
        chips.push(String(interpreted.district));
    }

    if (interpreted.category) {
        chips.push(String(interpreted.category));
    }

    const minScore = coerceFiniteNumber(
        interpreted.minScore
    );
    const maxScore = coerceFiniteNumber(
        interpreted.maxScore
    );

    if (
        Number.isFinite(minScore) &&
        Number.isFinite(maxScore)
    ) {
        chips.push(
            `${minScore}~${maxScore}점`
        );
    } else if (Number.isFinite(minScore)) {
        chips.push(`${minScore}점 이상`);
    } else if (Number.isFinite(maxScore)) {
        chips.push(`${maxScore}점 이하`);
    }

    if (interpreted.keyword) {
        chips.push(String(interpreted.keyword));
    }

    return chips.filter(Boolean);
};

const Home = () => {
    const navigate = useNavigate();

    const [stores, setStores] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedStoreSummary, setSelectedStoreSummary] =
        useState(null);
    const [searchInterpretation, setSearchInterpretation] =
        useState(null);
    const [mapCenterStore, setMapCenterStore] =
        useState(null);

    const fetchWorkspaces = async (
        keyword = '',
        shouldCenterResult = false
    ) => {
        try {
            const data = await getWorkspaces(null, keyword);

            if (Array.isArray(data)) {
                setStores(data);

                if (shouldCenterResult) {
                    setMapCenterStore(
                        findFirstMappableStore(data)
                    );
                }
            } else {
                console.error(
                    '사업장 데이터가 배열 형태가 아닙니다.',
                    data
                );
                setStores([]);

                if (shouldCenterResult) {
                    setMapCenterStore(null);
                }
            }
        } catch (error) {
            console.error('API 연동 에러:', error);
            setStores([]);

            if (shouldCenterResult) {
                setMapCenterStore(null);
            }
        }
    };

    useEffect(() => {
        fetchWorkspaces('');
    }, []);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) {
            return;
        }

        const container = document.getElementById('kakao-map');

        if (!container) {
            return;
        }

        const centerCoordinates =
            getStoreCoordinates(mapCenterStore) ||
            DEFAULT_MAP_CENTER;
        const options = {
            center: new window.kakao.maps.LatLng(
                centerCoordinates.lat,
                centerCoordinates.lng
            ),
            level: 4
        };

        const map = new window.kakao.maps.Map(container, options);

        stores.forEach((store) => {
            const score = store.cleanScore;
            const lat = store.latitude;
            const lng = store.longitude;

            if (
                lat === null ||
                lat === undefined ||
                lng === null ||
                lng === undefined
            ) {
                return;
            }

            const { accentColor } = getCleanGradeInfo(score);

            const svgMarker = `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="40"
                    viewBox="0 0 24 35"
                >
                    <path
                        fill="${accentColor}"
                        d="M12 0C5.373 0 0 5.373 0 12c0 7.747 12 23 12 23s12-15.253 12-23C24 5.373 18.627 0 12 0zm0 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"
                    />
                </svg>
            `;

            const markerImageUrl =
                `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarker)}`;

            const markerImage = new window.kakao.maps.MarkerImage(
                markerImageUrl,
                new window.kakao.maps.Size(28, 40)
            );

            const markerPosition = new window.kakao.maps.LatLng(lat, lng);

            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                image: markerImage
            });

            marker.setMap(map);

            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedStore(store);
            });
        });
    }, [stores, mapCenterStore]);

    useEffect(() => {
        if (!selectedStore) {
            setSelectedStoreSummary(null);
            return undefined;
        }

        if (!selectedStore.workspaceId) {
            setSelectedStoreSummary(selectedStore);
            return undefined;
        }

        let isMounted = true;

        const fetchSummary = async () => {
            try {
                const data = await getWorkspaceSummary(
                    selectedStore.workspaceId
                );

                if (isMounted) {
                    setSelectedStoreSummary({
                        ...selectedStore,
                        ...data
                    });
                }
            } catch (error) {
                console.error(
                    '사업장 요약 정보를 불러오지 못했습니다.',
                    error
                );

                if (isMounted) {
                    setSelectedStoreSummary(selectedStore);
                }
            }
        };

        fetchSummary();

        return () => {
            isMounted = false;
        };
    }, [selectedStore]);

    const executeSearch = (nextKeyword = searchTerm) => {
        const keyword = nextKeyword.trim();

        if (!keyword) {
            setSearchInterpretation(null);
            setMapCenterStore(null);
            fetchWorkspaces('');
            setSelectedStore(null);
            return;
        }

        const runSearch = async () => {
            try {
                const data =
                    await searchWorkspacesNaturalLanguage(
                        keyword
                    );

                setSearchInterpretation(
                    data.interpreted || null
                );
                const nextStores = Array.isArray(data.results)
                    ? data.results
                    : [];

                setStores(
                    nextStores
                );
                setMapCenterStore(
                    findFirstMappableStore(nextStores)
                );
            } catch (error) {
                console.error(
                    '자연어 검색 API 연동 에러:',
                    error
                );

                if (
                    shouldFallbackToKeywordSearch(error)
                ) {
                    setSearchInterpretation(null);
                    await fetchWorkspaces(
                        keyword,
                        true
                    );
                    return;
                }

                setSearchInterpretation(null);
                setStores([]);
                setMapCenterStore(null);
            }
        };

        runSearch();
        setSelectedStore(null);
    };

    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            executeSearch();
        }
    };

    const handleSearchInputChange = (event) => {
        const nextValue = event.target.value;

        setSearchTerm(nextValue);

        if (!nextValue.trim()) {
            setSearchInterpretation(null);
            setSelectedStore(null);
            setSelectedStoreSummary(null);
            setMapCenterStore(null);
            fetchWorkspaces('');
        }
    };

    const activeSelectedStore =
        selectedStoreSummary || selectedStore;
    const selectedGrade = activeSelectedStore
        ? getCleanGradeInfo(activeSelectedStore.cleanScore)
        : null;
    const evidenceSummary = activeSelectedStore
        ? getWorkspaceEvidenceSummary(activeSelectedStore)
        : null;
    const interpretedChips =
        buildInterpretedSearchChips(
            searchInterpretation
        );

    return (
        <div style={pageStyle}>
            <AppHeader />

            <main style={contentStyle}>
                <section style={mapContainerStyle}>
                    <div
                        id="kakao-map"
                        style={mapStyle}
                    />

                    <div style={legendBoxStyle}>
                        <div style={legendRowStyle}>
                            <span
                                style={{
                                    ...legendDotStyle,
                                    backgroundColor: '#009900'
                                }}
                            />
                            80점 이상 우수
                        </div>

                        <div style={legendRowStyle}>
                            <span
                                style={{
                                    ...legendDotStyle,
                                    backgroundColor: '#FFC000'
                                }}
                            />
                            60~79점 보통
                        </div>

                        <div style={legendRowStyle}>
                            <span
                                style={{
                                    ...legendDotStyle,
                                    backgroundColor: '#FF6600'
                                }}
                            />
                            40~59점 주의
                        </div>

                        <div style={legendRowStyle}>
                            <span
                                style={{
                                    ...legendDotStyle,
                                    backgroundColor: '#DD0000'
                                }}
                            />
                            40점 미만 위험
                        </div>
                    </div>

                    {activeSelectedStore &&
                        selectedGrade && (
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${activeSelectedStore.name} 사업장 정보`}
                            style={{
                                ...popupStyle,
                                backgroundColor: selectedGrade.softColor,
                                borderColor:
                                    selectedGrade.borderColor
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedStore(null)}
                                style={popupCloseBtnStyle}
                                aria-label="팝업 닫기"
                            >
                                ✕
                            </button>

                            <div style={statusBadgeRowStyle}>
                                <span
                                    style={{
                                        ...tagStatusStyle,
                                        color: selectedGrade.color
                                    }}
                                >
                                    {selectedGrade.label}
                                </span>
                            </div>

                            <h3 style={popupStoreNameStyle}>
                                {activeSelectedStore.name ||
                                    '사업장 이름 없음'}
                            </h3>

                            <p style={popupMetaStyle}>
                                <span>
                                    {activeSelectedStore.district ||
                                        '지역 정보 없음'}
                                </span>
                                <span style={metaDividerStyle}>•</span>
                                <span>
                                    {activeSelectedStore.category ||
                                        '업종 정보 없음'}
                                </span>
                            </p>

                            <div style={grayBoxStyle}>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>클린 점수:</span>
                                    <strong
                                        style={{
                                            ...boxValueStyle,
                                            color: selectedGrade.color
                                        }}
                                    >
                                        {formatCleanScore(
                                            activeSelectedStore.cleanScore
                                        )}
                                    </strong>
                                </div>

                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>산출 근거:</span>
                                    <div style={evidenceBlockStyle}>
                                        <span
                                            style={{
                                                ...evidenceHeadingStyle,
                                                color:
                                                    evidenceSummary?.focus ===
                                                    'positive'
                                                        ? '#08752A'
                                                        : '#B30000'
                                            }}
                                        >
                                            {evidenceSummary?.heading}
                                        </span>

                                        {evidenceSummary?.items?.length ? (
                                            <div
                                                style={
                                                    evidenceItemsGridStyle
                                                }
                                            >
                                                {evidenceSummary.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        style={evidenceItemStyle}
                                                    >
                                                        <span
                                                            style={{
                                                                ...evidenceTypeBadgeStyle,
                                                                backgroundColor:
                                                                    evidenceSummary.focus ===
                                                                    'positive'
                                                                        ? 'rgba(0, 153, 0, 0.12)'
                                                                        : 'rgba(221, 0, 0, 0.12)',
                                                                color:
                                                                    evidenceSummary.focus ===
                                                                    'positive'
                                                                        ? '#08752A'
                                                                        : '#B30000'
                                                            }}
                                                        >
                                                            {evidenceSummary.focus ===
                                                            'positive'
                                                                ? 'O'
                                                                : 'X'}
                                                        </span>

                                                        <div
                                                            style={
                                                                evidenceContentStyle
                                                            }
                                                        >
                                                            <strong
                                                                style={
                                                                    evidenceTextStyle
                                                                }
                                                            >
                                                                {item.shortText ||
                                                                    `${item.label} ${item.metric || ''}`.trim()}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span
                                                style={
                                                    evidenceFallbackTextStyle
                                                }
                                            >
                                                {evidenceSummary?.fallbackText ||
                                                    '수집된 근거 데이터가 없습니다.'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={tintedBoxStyle}>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>누적 후기:</span>
                                    <span style={boxTextStyle}>
                                        {activeSelectedStore.reviewCount ??
                                            0}
                                        명 참여
                                    </span>
                                </div>

                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>후기 요약:</span>
                                    <span
                                        style={
                                            popupSummaryTextStyle
                                        }
                                    >
                                        {activeSelectedStore.reviewSummary ||
                                            '아직 요약된 후기가 없습니다.'}
                                    </span>
                                </div>
                            </div>

                            <div style={detailButtonAreaStyle}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/detail/${activeSelectedStore.workspaceId}`
                                        )
                                    }
                                    style={{
                                        ...modernDetailBtnStyle,
                                        color: selectedGrade.color
                                    }}
                                >
                                    후기 자세히 보기 ➔
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate('/review/select')}
                        style={fabStyle}
                    >
                        후기 쓰기
                    </button>
                </section>

                <aside style={sidebarStyle}>
                    <div style={sidebarHeaderAreaStyle}>
                        <div style={searchContainerStyle}>
                            <input
                                type="text"
                                placeholder="사업장 이름 및 원하는 조건 검색"
                                value={searchTerm}
                                onChange={
                                    handleSearchInputChange
                                }
                                onKeyDown={handleSearch}
                                style={sidebarSearchInputStyle}
                            />

                            <button
                                type="button"
                                onClick={executeSearch}
                                style={searchIconButtonStyle}
                                aria-label="사업장 검색"
                            >
                                🔍
                            </button>
                        </div>

                        <div style={searchExampleTextStyle}>
                            ex)클린점수 60점 넘는 상대 카페 추천해줘
                        </div>

                        {interpretedChips.length > 0 && (
                            <div
                                style={
                                    searchChipListStyle
                                }
                            >
                                {interpretedChips.map(
                                    (chip) => (
                                        <span
                                            key={chip}
                                            style={
                                                searchChipStyle
                                            }
                                        >
                                            {chip}
                                        </span>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    <div style={listTitleAreaStyle}>
                        <h2 style={listTitleStyle}>
                            클린 사업장 리스트
                        </h2>

                        <span style={listCountStyle}>
                            전체 {stores.length}건
                        </span>
                    </div>

                    <div style={listContainerStyle}>
                        {stores.length > 0 ? (
                            stores.map((store) => {
                                const grade =
                                    getCleanGradeInfo(store.cleanScore);

                                return (
                                    <button
                                        type="button"
                                        key={store.workspaceId}
                                        style={listItemStyle}
                                        onClick={() => {
                                            setSelectedStore(store)
                                            setMapCenterStore(store);
                                        }}
                                    >
                                        <div style={listItemTopStyle}>
                                            <div style={storeNameStyle}>
                                                {store.name ||
                                                    '사업장 이름 없음'}
                                            </div>

                                            <div
                                                style={{
                                                    ...storeScoreStyle,
                                                    color: grade.color
                                                }}
                                            >
                                                {formatCleanScore(
                                                    store.cleanScore
                                                )}
                                            </div>
                                        </div>

                                        <div style={storeInfoStyle}>
                                            {store.district ||
                                                '지역 정보 없음'}
                                            {' • '}
                                            {store.category ||
                                                '업종 정보 없음'}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div style={emptyStyle}>
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
};

const pageStyle = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column'
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    padding: '0 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #ddd',
    boxSizing: 'border-box',
    zIndex: 10
};

const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
};

const headerRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
};

const logoBtnStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#333'
};

const navBtnStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#444'
};

const btnStyle = {
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#444'
};

const kakaoLoginBtnStyle = {
    height: '38px',
    minWidth: '154px',
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    backgroundColor: '#FEE500',
    color: '#191919',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
};

const kakaoLogoStyle = {
    width: '23px',
    height: '23px',
    flexShrink: 0,
    display: 'block'
};

const kakaoLoginTextStyle = {
    color: '#191919',
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: 1
};

const adminBtnStyle = {
    ...btnStyle,
    color: 'red',
    borderColor: 'red',
    fontWeight: 'bold'
};

const profileButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer'
};

const profileTextStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333'
};

const profileCircleStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '1px solid #eee',
    backgroundColor: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const profileImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
};

const contentStyle = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
};

const mapContainerStyle = {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e9ecef'
};

const mapStyle = {
    width: '100%',
    height: '100%'
};

const legendBoxStyle = {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '16px',
    zIndex: 15,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const legendRowStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '15px',
    color: '#444',
    fontWeight: '500'
};

const legendDotStyle = {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    marginRight: '10px',
    flexShrink: 0
};

const sidebarStyle = {
    width: '400px',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 5
};

const sidebarHeaderAreaStyle = {
    padding: '20px 20px 14px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#fafafa'
};

const listTitleAreaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '20px 20px 16px',
    borderBottom: '1px solid #eee'
};

const listTitleStyle = {
    fontSize: '18px',
    margin: 0
};

const listCountStyle = {
    fontSize: '13px',
    color: '#888',
    fontWeight: 'bold'
};

const searchContainerStyle = {
    position: 'relative',
    width: '100%'
};

const sidebarSearchInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 44px 12px 14px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    outline: 'none',
    fontSize: '15px'
};

const searchIconButtonStyle = {
    position: 'absolute',
    right: '5px',
    top: '50%',
    width: '36px',
    height: '36px',
    transform: 'translateY(-50%)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px'
};

const searchExampleTextStyle = {
    fontSize: '12px',
    color: '#777',
    marginTop: '10px',
    paddingLeft: '4px',
    lineHeight: '1.4',
    fontWeight: '500'
};

const searchChipListStyle = {
    marginTop: '12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
};

const searchChipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '28px',
    padding: '0 10px',
    border: '1px solid #d8e2ff',
    backgroundColor: '#eef3ff',
    color: '#3f63f4',
    fontSize: '12px',
    fontWeight: '700',
    borderRadius: '999px',
    boxSizing: 'border-box'
};

const listContainerStyle = {
    overflowY: 'auto',
    flex: 1
};

const listItemStyle = {
    display: 'block',
    width: '100%',
    padding: '20px',
    border: 'none',
    borderBottom: '1px solid #eee',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    cursor: 'pointer'
};

const listItemTopStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
};

const storeNameStyle = {
    minWidth: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#222',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

const storeScoreStyle = {
    flexShrink: 0,
    fontWeight: 'bold',
    fontSize: '16px'
};

const storeInfoStyle = {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
    fontWeight: '500'
};

const emptyStyle = {
    padding: '24px',
    color: '#777',
    fontSize: '14px',
    textAlign: 'center'
};

const fabStyle = {
    position: 'absolute',
    top: '24px',
    left: '24px',
    width: '100px',
    height: '40px',
    backgroundColor: '#ffffff',
    color: '#222',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 15
};

const popupStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',

    width: '336px',
    height: '448px',
    maxWidth: 'calc(100% - 32px)',
    maxHeight: 'calc(100% - 32px)',

    padding: '20px',
    boxSizing: 'border-box',

    backgroundColor: '#ffffff',
    border: '1px solid #D6DDE8',
    borderRadius: 0,

    overflow: 'hidden',

    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',

    boxShadow: 'none'
};

const popupCloseBtnStyle = {
    position: 'absolute',
    top: '14px',
    right: '14px',

    width: '30px',
    height: '30px',
    padding: 0,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'transparent',
    border: 'none',

    color: '#8a8a8a',
    fontSize: '19px',
    lineHeight: 1,
    cursor: 'pointer'
};

const statusBadgeRowStyle = {
    display: 'flex',
    alignItems: 'center',

    minHeight: '30px',
    marginBottom: '12px',
    paddingRight: '38px'
};

const tagStatusStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',

    minWidth: '48px',
    padding: '6px 11px',

    backgroundColor: 'rgba(255,255,255,0.72)',
    border: 'none',
    borderRadius: 0,

    fontSize: '13px',
    fontWeight: '900'
};

const popupStoreNameStyle = {
    margin: '0 0 6px',
    paddingRight: '30px',

    color: '#2d2d2d',
    fontSize: '19px',
    fontWeight: '900',
    lineHeight: '1.25',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'keep-all'
};

const popupMetaStyle = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',

    gap: '6px',
    margin: '0 0 14px',

    color: '#666666',
    fontSize: '12px',
    fontWeight: '600'
};

const metaDividerStyle = {
    color: '#a5a5a5'
};

const grayBoxStyle = {
    display: 'flex',
    flexDirection: 'column',

    gap: '8px',
    marginBottom: '10px',
    padding: '12px 13px',

    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(214, 221, 232, 0.96)',
    borderRadius: 0
};

const tintedBoxStyle = {
    display: 'flex',
    flexDirection: 'column',

    gap: '8px',
    marginBottom: '0',
    padding: '12px 13px',

    backgroundColor: 'rgba(255,255,255,0.48)',
    border: '1px solid rgba(214, 221, 232, 0.96)',
    borderRadius: 0
};

const boxRowStyle = {
    display: 'flex',
    alignItems: 'flex-start',

    gap: '10px',

    color: '#333333',
    fontSize: '12px',
    lineHeight: '1.45'
};

const boxLabelStyle = {
    minWidth: '62px',
    color: '#555555',
    fontWeight: '900',
    flexShrink: 0
};

const boxValueStyle = {
    fontSize: '14px',
    fontWeight: '900'
};

const boxTextStyle = {
    minWidth: 0,

    color: '#333333',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.45',

    wordBreak: 'keep-all'
};

const popupSummaryTextStyle = {
    ...boxTextStyle,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
};

const evidenceBlockStyle = {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const evidenceHeadingStyle = {
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '-0.2px'
};

const evidenceItemsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '6px'
};

const evidenceItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    minHeight: '34px',
    padding: '6px 8px',
    border: '1px solid rgba(214, 221, 232, 0.96)',
    backgroundColor: 'rgba(255,255,255,0.86)'
};

const evidenceTypeBadgeStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: '999px',
    fontSize: '9px',
    fontWeight: '900'
};

const evidenceContentStyle = {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0
};

const evidenceTextStyle = {
    display: 'block',
    minWidth: 0,
    color: '#333333',
    fontSize: '11px',
    fontWeight: '900',
    lineHeight: '1.25',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
};

const evidenceFallbackTextStyle = {
    ...boxTextStyle,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
};

const evidenceItemTopStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
};

const evidenceLabelStyle = {
    color: '#333333',
    fontSize: '13px',
    fontWeight: '900'
};

const evidenceMetricStyle = {
    color: '#6f7781',
    fontSize: '11px',
    fontWeight: '700'
};

const detailButtonAreaStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 'auto',
    paddingTop: '12px',
    flexShrink: 0
};

const modernDetailBtnStyle = {
    padding: '9px 14px',

    backgroundColor: 'rgba(255,255,255,0.82)',
    border: 'none',
    borderRadius: 0,

    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',

    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: '1.2',
    fontWeight: '900'
};

const closeIconBtnStyle = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#999'
};

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const introModalStyle = {
    backgroundColor: '#fff',
    width: '380px',
    maxWidth: 'calc(100% - 40px)',
    padding: '32px',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    borderRadius: 0,
    border: '1px solid #222'
};

const introHeaderStyle = {
    textAlign: 'center',
    marginBottom: '28px',
    marginTop: '8px'
};

const coreValueBadgeStyle = {
    border: '1px solid #3b82f6',
    color: '#3b82f6',
    padding: '4px 10px',
    borderRadius: 0,
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px'
};

const introTitleStyle = {
    fontSize: '20px',
    color: '#111',
    margin: '16px 0 8px',
    lineHeight: '1.4'
};

const introTitleAccentStyle = {
    color: '#3b82f6'
};

const introSubtitleStyle = {
    fontSize: '13px',
    color: '#666',
    margin: 0
};

const introFeatureListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};

const introFeatureStyle = {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#fdfdfd',
    borderRadius: 0,
    border: '1px solid #eaeaea'
};

const introFeatureIconStyle = {
    backgroundColor: '#3b82f6',
    color: '#fff',
    width: '28px',
    height: '28px',
    borderRadius: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0
};

const introFeatureTitleStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '4px'
};

const introFeatureDescStyle = {
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.5',
    wordBreak: 'keep-all'
};

export default Home;

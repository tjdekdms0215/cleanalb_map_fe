import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://cleanalb-map.duckdns.org';
const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;

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

const Home = () => {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const [stores, setStores] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [showIntroModal, setShowIntroModal] = useState(false);

    const fetchWorkspaces = async (keyword = '') => {
        try {
            const url = keyword
                ? `${API_BASE_URL}/workspaces?keyword=${encodeURIComponent(keyword)}`
                : `${API_BASE_URL}/workspaces`;

            const response = await fetch(url);

            if (!response.ok) {
                console.error('사업장 데이터를 불러오는 데 실패했습니다.');
                return;
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setStores(data);
            } else {
                console.error('사업장 데이터가 배열 형태가 아닙니다.', data);
                setStores([]);
            }
        } catch (error) {
            console.error('API 연동 에러:', error);
            setStores([]);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const savedNickname = localStorage.getItem('user_nickname');
        const userRole = localStorage.getItem('user_role');

        if (token) {
            setIsLoggedIn(true);

            if (savedNickname) {
                setNickname(savedNickname);
            }

            if (userRole === 'ADMIN') {
                setIsAdmin(true);
            }
        }

        fetchWorkspaces();
    }, []);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) {
            return;
        }

        const container = document.getElementById('kakao-map');

        if (!container) {
            return;
        }

        const options = {
            center: new window.kakao.maps.LatLng(35.1764, 126.9135),
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
    }, [stores]);

    const handleKakaoLogin = () => {
        if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
            console.error('카카오 로그인 환경변수가 설정되지 않았습니다.');
            alert('카카오 로그인 설정을 확인해 주세요.');
            return;
        }

        const state = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        sessionStorage.setItem('kakao_oauth_state', state);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: KAKAO_REST_API_KEY,
            redirect_uri: KAKAO_REDIRECT_URI,
            state
        });

        window.location.assign(
            `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
        );
    };

    const handleLogout = () => {
        localStorage.clear();

        setIsLoggedIn(false);
        setNickname('');
        setIsAdmin(false);

        alert('로그아웃 되었습니다.');
    };

    const executeSearch = () => {
        const keyword = searchTerm.trim();

        fetchWorkspaces(keyword);
        setSelectedStore(null);
    };

    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            executeSearch();
        }
    };

    const selectedGrade = selectedStore
        ? getCleanGradeInfo(selectedStore.cleanScore)
        : null;

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <div style={headerLeftStyle}>
                    <button
                        type="button"
                        style={logoBtnStyle}
                        onClick={() => navigate('/')}
                    >
                        전남대 클린알바맵
                    </button>

                    <button
                        type="button"
                        style={navBtnStyle}
                        onClick={() => setShowIntroModal(true)}
                    >
                        서비스 소개
                    </button>

                    <button
                        type="button"
                        style={navBtnStyle}
                        onClick={() => navigate('/guide')}
                    >
                        근로기준법 안내
                    </button>
                </div>

                <div style={headerRightStyle}>
                    {isLoggedIn ? (
                        <>
                            <button
                                type="button"
                                style={profileButtonStyle}
                                onClick={() => navigate('/profile')}
                            >
                                <div style={profileCircleStyle}>
                                    <img
                                        src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                                        alt="프로필"
                                        style={profileImageStyle}
                                    />
                                </div>

                                {nickname && (
                                    <span style={profileTextStyle}>
                                        {nickname}님
                                    </span>
                                )}
                            </button>

                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin')}
                                    style={adminBtnStyle}
                                >
                                    ⚙️ 관리자
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleLogout}
                                style={btnStyle}
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleKakaoLogin}
                            style={kakaoLoginBtnStyle}
                            aria-label="카카오 로그인"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                style={kakaoLogoStyle}
                                aria-hidden="true"
                            >
                                <path
                                    fill="#191919"
                                    d="M12 3C6.477 3 2 6.582 2 11c0 2.833 1.838 5.321 4.611 6.744l-1.153 4.227c-.103.377.327.681.656.464l5.119-3.386c.253.014.509.021.767.021 5.523 0 10-3.582 10-8.07C22 6.582 17.523 3 12 3Z"
                                />
                            </svg>

                            <span style={kakaoLoginTextStyle}>
                                카카오 로그인
                            </span>
                        </button>
                    )}
                </div>
            </header>

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

                    {selectedStore && selectedGrade && (
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${selectedStore.name} 사업장 정보`}
                            style={{
                                ...popupStyle,
                                backgroundColor: selectedGrade.softColor,
                                boxShadow: `0 12px 34px ${selectedGrade.shadowColor}`
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
                                {selectedStore.name || '사업장 이름 없음'}
                            </h3>

                            <p style={popupMetaStyle}>
                                <span>
                                    {selectedStore.district || '지역 정보 없음'}
                                </span>
                                <span style={metaDividerStyle}>•</span>
                                <span>
                                    {selectedStore.category || '업종 정보 없음'}
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
                                        {formatCleanScore(selectedStore.cleanScore)}
                                    </strong>
                                </div>

                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>산출 근거:</span>
                                    <span style={boxTextStyle}>
                                        {selectedStore.oxStats ||
                                            '수집된 근거 데이터가 없습니다.'}
                                    </span>
                                </div>
                            </div>

                            <div style={tintedBoxStyle}>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>누적 후기:</span>
                                    <span style={boxTextStyle}>
                                        {selectedStore.reviewCount ?? 0}명 참여
                                    </span>
                                </div>

                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>후기 요약:</span>
                                    <span style={boxTextStyle}>
                                        {selectedStore.reviewSummary ||
                                            '아직 요약된 후기가 없습니다.'}
                                    </span>
                                </div>
                            </div>

                            <div style={detailButtonAreaStyle}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/detail/${selectedStore.workspaceId}`
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
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
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
                             조건 예시: 클린점수 60점 넘는 카페 찾아줘
                        </div>
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
                                        onClick={() =>
                                            setSelectedStore(store)
                                        }
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

            {showIntroModal && (
                <div
                    style={modalOverlayStyle}
                    onClick={() => setShowIntroModal(false)}
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="서비스 소개"
                        style={introModalStyle}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setShowIntroModal(false)}
                            style={closeIconBtnStyle}
                            aria-label="서비스 소개 닫기"
                        >
                            ✕
                        </button>

                        <div style={introHeaderStyle}>
                            <span style={coreValueBadgeStyle}>
                                CORE VALUE
                            </span>

                            <h2 style={introTitleStyle}>
                                안전한 알바를 위한
                                <br />

                                <span style={introTitleAccentStyle}>
                                    전남대 클린알바맵
                                </span>
                            </h2>

                            <p style={introSubtitleStyle}>
                                솔직한 후기, 공정한 평가로 더 나은 문화를
                                만듭니다.
                            </p>
                        </div>

                        <div style={introFeatureListStyle}>
                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>01</div>

                                <div>
                                    <div style={introFeatureTitleStyle}>
                                        클린 지수 시각화
                                    </div>

                                    <div style={introFeatureDescStyle}>
                                        사업장의 근로기준법 준수 여부를 100점
                                        만점으로 점수화해 컬러 핀으로
                                        표시합니다.
                                    </div>
                                </div>
                            </div>

                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>02</div>

                                <div>
                                    <div style={introFeatureTitleStyle}>
                                        인증 기반 후기
                                    </div>

                                    <div style={introFeatureDescStyle}>
                                        실제 근로 증명 자료를 첨부해야만 후기를
                                        작성할 수 있어 객관적이고 신뢰할 수
                                        있습니다.
                                    </div>
                                </div>
                            </div>

                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>03</div>

                                <div>
                                    <div style={introFeatureTitleStyle}>
                                        AI 후기 순화
                                    </div>

                                    <div style={introFeatureDescStyle}>
                                        명예훼손 소지가 있는 표현을 안전한
                                        언어로 자동 변환해 작성자의 법적
                                        리스크를 낮춥니다.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

    width: '360px',
    maxWidth: 'calc(100% - 32px)',
    maxHeight: 'calc(100% - 32px)',

    padding: '22px',
    boxSizing: 'border-box',

    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: 0,

    overflowX: 'hidden',
    overflowY: 'auto',

    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',

    boxShadow: '0 10px 28px rgba(0,0,0,0.16)'
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
    marginBottom: '16px',
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
    fontSize: '21px',
    fontWeight: '900',
    lineHeight: '1.3',

    wordBreak: 'keep-all'
};

const popupMetaStyle = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',

    gap: '6px',
    margin: '0 0 18px',

    color: '#666666',
    fontSize: '13px',
    fontWeight: '600'
};

const metaDividerStyle = {
    color: '#a5a5a5'
};

const grayBoxStyle = {
    display: 'flex',
    flexDirection: 'column',

    gap: '10px',
    marginBottom: '12px',
    padding: '15px 16px',

    backgroundColor: 'rgba(255,255,255,0.72)',
    border: 'none',
    borderRadius: 0
};

const tintedBoxStyle = {
    display: 'flex',
    flexDirection: 'column',

    gap: '10px',
    marginBottom: '16px',
    padding: '15px 16px',

    backgroundColor: 'rgba(255,255,255,0.48)',
    border: 'none',
    borderRadius: 0
};

const boxRowStyle = {
    display: 'flex',
    alignItems: 'flex-start',

    gap: '12px',

    color: '#333333',
    fontSize: '13px',
    lineHeight: '1.55'
};

const boxLabelStyle = {
    minWidth: '72px',
    color: '#555555',
    fontWeight: '900',
    flexShrink: 0
};

const boxValueStyle = {
    fontSize: '15px',
    fontWeight: '900'
};

const boxTextStyle = {
    minWidth: 0,

    color: '#333333',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.55',

    wordBreak: 'keep-all'
};

const detailButtonAreaStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '2px'
};

const modernDetailBtnStyle = {
    padding: '11px 16px',

    backgroundColor: 'rgba(255,255,255,0.82)',
    border: 'none',
    borderRadius: 0,

    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',

    cursor: 'pointer',
    fontSize: '13px',
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
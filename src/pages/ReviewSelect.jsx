import React, { useEffect, useState } from 'react';
import {
    useLocation,
    useNavigate
} from 'react-router-dom';
import { searchReviewTargets, resolveWorkspace } from '../api/workspace';
import AppHeader from '../components/AppHeader';
import useMediaQuery from '../hooks/useMediaQuery';

const ReviewSelect = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery('(max-width: 640px)');

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    useEffect(() => {
        if (location.state?.authRequired) {
            setErrorMessage(
                '후기 작성은 로그인 후 이용할 수 있습니다. 먼저 로그인해 주세요.'
            );
        }

        if (location.state?.missingWorkspace) {
            setErrorMessage(
                '선택된 사업장 정보가 없어 다시 선택 화면으로 이동했습니다.'
            );
        }
    }, [location.state]);

    // 💡 1. 검색 함수 깔끔하게 교체
    const handleSearch = async (event) => {
    event.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
        setErrorMessage('사업장 이름을 입력해 주세요.');
        setResults([]);
        setHasSearched(false);
        return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setHasSearched(true);

    try {
        const data = await searchReviewTargets(
            trimmedKeyword
        );

        console.log('화면 표시 검색 결과:', data);

        setResults(data);
    } catch (error) {
        console.error(
            '후기 대상 사업장 검색 오류:',
            error
        );

        setResults([]);
        setErrorMessage(
            '사업장 검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
    } finally {
        setIsLoading(false);
    }
};

    // 💡 2. Resolve(선택) 함수 깔끔하게 교체
    const handleSelectWorkspace = async (place) => {
        // 1. 이미 DB에 등록된 사업장인 경우
        if (place.existing && place.workspaceId) {
            navigate(`/review/write/${place.workspaceId}`, {
                state: { workspace: place }
            });
            return;
        }

        if (!isLoggedIn) {
            sessionStorage.setItem(
                'selected_kakao_place',
                JSON.stringify(place)
            );
            navigate('/review/write/new', {
                state: { workspace: place }
            });
            return;
        }

        // 2. 미등록 사업장인 경우 - Resolve API 호출
        try {
            setIsLoading(true);
            
            // API 파일의 함수에 객체만 딱 넘겨줍니다
            const data = await resolveWorkspace({
                kakaoPlaceId: place.kakaoPlaceId,
                name: place.name,
                address: place.address,
                category: place.category || '기타',
                latitude: place.latitude,
                longitude: place.longitude
            });

            const resolvedWorkspaceId = data.workspaceId;

            if (!resolvedWorkspaceId) {
                throw new Error('생성된 workspaceId가 존재하지 않습니다.');
            }

            navigate(`/review/write/${resolvedWorkspaceId}`, {
                state: { workspace: { ...place, workspaceId: resolvedWorkspaceId, existing: true } }
            });

        } catch (error) {
            console.error('사업장 Resolve 에러:', error);

            if (error?.response?.status === 401) {
                sessionStorage.setItem(
                    'selected_kakao_place',
                    JSON.stringify(place)
                );
                navigate('/review/write/new', {
                    state: { workspace: place }
                });
                return;
            }

            alert('사업장 정보를 동기화하는 데 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div style={pageStyle}>
            <AppHeader />

            <main
                style={{
                    ...mainStyle,
                    ...(isMobile
                        ? mobileMainStyle
                        : null)
                }}
            >
                <section
                    style={{
                        ...contentSectionStyle,
                        ...(isMobile
                            ? mobileContentSectionStyle
                            : null)
                    }}
                >
                    <div style={titleAreaStyle}>
                        <h1 style={titleStyle}>알바 후기 작성</h1>
                        <p style={subtitleStyle}>
                            후기를 남길 사업장을 검색하세요.
                        </p>
                    </div>

                    <div
                        style={{
                            ...searchCardStyle,
                            ...(isMobile
                                ? mobileSearchCardStyle
                                : null)
                        }}
                    >
                        <div
                            style={{
                                ...searchTopStyle,
                                ...(isMobile
                                    ? mobileSearchTopStyle
                                    : null)
                            }}
                        >
                            <form
                                onSubmit={handleSearch}
                                style={{
                                    ...searchFormStyle,
                                    ...(isMobile
                                        ? mobileSearchFormStyle
                                        : null)
                                }}
                            >
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                    placeholder="사업장 이름 검색 (예: 파스쿠찌 전남대)"
                                    style={searchInputStyle}
                                    aria-label="후기를 작성할 사업장 이름"
                                />

                                <button
                                    type="submit"
                                    style={{
                                        ...searchButtonStyle,
                                        ...(isMobile
                                            ? mobileSearchButtonStyle
                                            : null),
                                        opacity: isLoading ? 0.72 : 1,
                                        cursor: isLoading
                                            ? 'default'
                                            : 'pointer'
                                    }}
                                    disabled={isLoading}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        style={searchIconStyle}
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M10.5 4a6.5 6.5 0 1 0 3.95 11.66l4.44 4.45 1.42-1.42-4.45-4.44A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                                        />
                                    </svg>

                                    {isLoading ? '검색 중' : '검색'}
                                </button>
                            </form>
                        </div>

                        {errorMessage && (
                            <div style={feedbackRowStyle}>
                                <span style={errorTextStyle}>
                                    {errorMessage}
                                </span>
                            </div>
                        )}

                        {isLoading && !errorMessage && (
                            <div style={feedbackRowStyle}>
                                <span style={statusTextStyle}>
                                    사업장을 처리하고 있습니다.
                                </span>
                            </div>
                        )}

                        {!isLoading &&
                            hasSearched &&
                            !errorMessage &&
                            results.length === 0 && (
                                <div style={feedbackRowStyle}>
                                    <span style={emptyResultStyle}>
                                        검색 결과가 없습니다.
                                    </span>
                                </div>
                            )}

                        {!isLoading && results.length > 0 && (
                            <div style={resultListStyle}>
                                {results.map((place) => {
                                    // 고유 키 (workspaceId 우선, 없으면 kakaoPlaceId)
                                    const resultKey = place.workspaceId || place.kakaoPlaceId;
                                    
                                    // 카테고리 없는 경우 '기타' 처리
                                    const category = place.category || '기타';
                                    const address = place.address || '주소 정보 없음';

                                    return (
                                        <button
                                            type="button"
                                            key={resultKey}
                                            onClick={() => handleSelectWorkspace(place)}
                                            style={{
                                                ...resultRowStyle,
                                                ...(isMobile
                                                    ? mobileResultRowStyle
                                                    : null)
                                            }}
                                        >
                                            <div style={resultMainStyle}>
                                                <strong style={placeNameStyle}>
                                                    {place.name || '사업장 이름 없음'}
                                                </strong>

                                                <div style={placeMetaLineStyle}>
                                                    <span style={categoryBadgeStyle(place.existing)}>
                                                        {place.existing ? '등록됨' : '신규'}
                                                    </span>
                                                    <span>{category}</span>
                                                    <span style={metaDividerStyle}>•</span>
                                                    <span>{address}</span>
                                                </div>
                                            </div>

                                            <span
                                                style={{
                                                    ...selectTextStyle,
                                                    ...(isMobile
                                                        ? mobileSelectTextStyle
                                                        : null)
                                                }}
                                            >
                                                선택
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </main>

        </div>
    );
};

// --- 기존 스타일과 동일 (등록됨/신규 뱃지 스타일 하나만 추가) ---

const categoryBadgeStyle = (isExisting) => ({
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: isExisting ? '#e0e7ff' : '#fef3c7',
    color: isExisting ? '#4338ca' : '#d97706',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginRight: '6px'
});

const pageStyle = {
    width: '100%',
    minHeight: '100dvh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden'
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    minHeight: '64px',
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

const profileTextStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333'
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

const mainStyle = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    boxSizing: 'border-box',
    backgroundColor: '#f7f8fa',
    overflowY: 'auto'
};

const mobileMainStyle = {
    padding: '28px 14px 42px',
    justifyContent: 'center'
};

const contentSectionStyle = {
    width: '100%',
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch'
};

const mobileContentSectionStyle = {
    maxWidth: '420px',
    margin: '0 auto'
};

const titleAreaStyle = {
    textAlign: 'center',
    marginBottom: '30px'
};

const titleStyle = {
    margin: '0 0 10px',
    color: '#202631',
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.6px'
};

const subtitleStyle = {
    margin: 0,
    color: '#7c8491',
    fontSize: '14px',
    fontWeight: '500'
};

const searchCardStyle = {
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #dfe3e8',
    boxSizing: 'border-box'
};

const mobileSearchCardStyle = {
    minHeight: '360px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start'
};

const searchTopStyle = {
    padding: '20px',
    boxSizing: 'border-box'
};

const mobileSearchTopStyle = {
    padding: '24px 20px 18px'
};

const searchFormStyle = {
    width: '100%',
    display: 'flex',
    gap: '8px'
};

const mobileSearchFormStyle = {
    flexDirection: 'column'
};

const searchInputStyle = {
    flex: 1,
    minWidth: 0,
    height: '46px',
    padding: '0 16px',
    border: '1px solid #d7dce3',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#222831',
    backgroundColor: '#ffffff',
    fontSize: '14px'
};

const searchButtonStyle = {
    width: '88px',
    height: '46px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: 0,
    backgroundColor: '#4169e1',
    border: 'none',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700'
};

const mobileSearchButtonStyle = {
    width: '100%'
};

const searchIconStyle = {
    width: '18px',
    height: '18px'
};

const feedbackRowStyle = {
    minHeight: '68px',
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderTop: '1px solid #e4e7eb',
    boxSizing: 'border-box'
};

const errorTextStyle = {
    margin: 0,
    color: '#c43b3b',
    fontSize: '13px',
    lineHeight: '1.5'
};

const statusTextStyle = {
    color: '#747c88',
    fontSize: '13px'
};

const emptyResultStyle = {
    color: '#747c88',
    fontSize: '13px'
};

const resultListStyle = {
    width: '100%',
    borderTop: '1px solid #e4e7eb'
};

const resultRowStyle = {
    width: '100%',
    minHeight: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px',
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    border: 'none',
    borderBottom: '1px solid #edf0f3',
    textAlign: 'left',
    cursor: 'pointer',
    boxSizing: 'border-box'
};

const mobileResultRowStyle = {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: '10px'
};

const resultMainStyle = {
    minWidth: 0,
    flex: 1
};

const placeNameStyle = {
    display: 'block',
    marginBottom: '5px',
    color: '#222831',
    fontSize: '14px',
    fontWeight: '800',
    lineHeight: '1.35'
};

const placeMetaLineStyle = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '5px',
    color: '#8a929f',
    fontSize: '12px',
    lineHeight: '1.4'
};

const metaDividerStyle = {
    color: '#b1b7c0'
};

const selectTextStyle = {
    flexShrink: 0,
    color: '#4169e1',
    fontSize: '12px',
    fontWeight: '600'
};

const mobileSelectTextStyle = {
    alignSelf: 'flex-end'
};

const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const introModalStyle = {
    width: '380px',
    maxWidth: 'calc(100% - 40px)',
    padding: '32px',
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1px solid #222',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
};

const modalCloseButtonStyle = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '18px'
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
    border: '1px solid #eaeaea'
};

const introFeatureIconStyle = {
    width: '28px',
    height: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold'
};

const introFeatureTitleStyle = {
    marginBottom: '4px',
    color: '#111',
    fontSize: '14px',
    fontWeight: 'bold'
};

const introFeatureDescStyle = {
    color: '#555',
    fontSize: '12px',
    lineHeight: '1.5',
    wordBreak: 'keep-all'
};

export default ReviewSelect;

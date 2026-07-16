import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchReviewTargets, resolveWorkspace } from '../api/workspace';


const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;

const ReviewSelect = () => {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showIntroModal, setShowIntroModal] = useState(false);

    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const savedNickname = localStorage.getItem('user_nickname');
        const userRole = localStorage.getItem('user_role');

        if (token) {
            setIsLoggedIn(true);
            setNickname(savedNickname || '');
            setIsAdmin(userRole === 'ADMIN');
        }
    }, []);

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
            // API 파일의 함수 호출
            const data = await searchReviewTargets(trimmedKeyword);
            const normalizedResults = Array.isArray(data) ? data : [];
            setResults(normalizedResults);
        } catch (error) {
            console.error('후기 대상 사업장 검색 오류:', error);
            setResults([]);
            setErrorMessage('사업장 검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
            alert('사업장 정보를 동기화하는 데 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };


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

            <main style={mainStyle}>
                <section style={contentSectionStyle}>
                    <div style={titleAreaStyle}>
                        <h1 style={titleStyle}>알바 후기 작성</h1>
                        <p style={subtitleStyle}>
                            후기를 남길 사업장을 검색하세요.
                        </p>
                    </div>

                    <div style={searchCardStyle}>
                        <div style={searchTopStyle}>
                            <form
                                onSubmit={handleSearch}
                                style={searchFormStyle}
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
                                            style={resultRowStyle}
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

                                            <span style={selectTextStyle}>
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
                            style={modalCloseButtonStyle}
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
                                        사업장의 근로기준법 준수 여부를
                                        점수화해 컬러 핀으로 표시합니다.
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
                                        실제 근로 증명 기반 후기로 신뢰도를
                                        높입니다.
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
                                        위험 표현을 안전한 문장으로 변환해
                                        작성자를 보호합니다.
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
    width: '100vw',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
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

const contentSectionStyle = {
    width: '100%',
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch'
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

const searchTopStyle = {
    padding: '20px',
    boxSizing: 'border-box'
};

const searchFormStyle = {
    width: '100%',
    display: 'flex',
    gap: '8px'
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
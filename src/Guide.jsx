import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const KAKAO_REST_API_KEY =
    import.meta.env.VITE_KAKAO_REST_API_KEY;

const KAKAO_REDIRECT_URI =
    import.meta.env.VITE_KAKAO_REDIRECT_URI;

const Guide = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('2026 최저시급');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showIntroModal, setShowIntroModal] = useState(false);

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
        navigate('/');
    };

    const tabs = [
        '2026 최저시급',
        '근로계약서',
        '주휴수당',
        '임금체불신고'
    ];

    const renderFAQ = (faqs) => (
        <div style={faqSectionStyle}>
            <h3 style={faqHeaderStyle}>자주 묻는 질문</h3>

            {faqs.map((faq, index) => (
                <div style={faqItemStyle} key={`${faq.q}-${index}`}>
                    <div style={faqQuestionStyle}>
                        <span>{faq.q}</span>
                        <span>^</span>
                    </div>

                    <div style={faqAnswerStyle}>
                        {faq.a}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case '2026 최저시급':
                return (
                    <>
                        <div
                            style={{
                                ...fullWidthWrapperStyle,
                                backgroundColor: '#4063ff',
                                color: '#ffffff'
                            }}
                        >
                            <div
                                style={{
                                    ...innerContainerStyle,
                                    paddingTop: '48px'
                                }}
                            >
                                <p style={heroSubStyle}>
                                    2026년 적용 기준
                                </p>

                                <h1 style={heroTitleStyle}>
                                    2026년 최저시급 10,320원
                                </h1>

                                <p style={heroDescStyle}>
                                    최저임금 제도는 임금의 최저수준을 정하고,
                                    이 수준 이상을 지급하도록 법으로 강제하는
                                    제도입니다.
                                </p>

                                <div style={heroStatsGridStyle}>
                                    <div style={heroStatItemStyle}>
                                        <div style={heroStatLabelStyle}>
                                            시급 1시간
                                        </div>
                                        <div style={heroStatValueStyle}>
                                            10,320원
                                        </div>
                                    </div>

                                    <div style={heroStatItemStyle}>
                                        <div style={heroStatLabelStyle}>
                                            일급 8시간
                                        </div>
                                        <div style={heroStatValueStyle}>
                                            82,560원
                                        </div>
                                    </div>

                                    <div style={heroStatItemStyle}>
                                        <div style={heroStatLabelStyle}>
                                            주급 40시간
                                        </div>
                                        <div style={heroStatValueStyle}>
                                            412,800원
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            ...heroStatItemStyle,
                                            borderRight: 'none'
                                        }}
                                    >
                                        <div style={heroStatLabelStyle}>
                                            월급 209시간
                                        </div>
                                        <div style={heroStatValueStyle}>
                                            2,156,880원
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                ...fullWidthWrapperStyle,
                                flex: 1
                            }}
                        >
                            <div
                                style={{
                                    ...innerContainerStyle,
                                    padding: '56px 32px 80px'
                                }}
                            >
                                <div style={threeColGridStyle}>
                                    <div style={cardStyle}>
                                        <h3 style={cardTitleStyle}>
                                            최저임금액
                                        </h3>
                                        <p style={cardTextStyle}>
                                            2026년 적용 최저임금은 시간당
                                            10,320원입니다.
                                        </p>
                                        <p style={cardSmallTextStyle}>
                                            단, 근로계약기간이 1년 미만이거나
                                            단순노무직은 감액 불가.
                                        </p>
                                    </div>

                                    <div style={cardStyle}>
                                        <h3 style={cardTitleStyle}>
                                            적용 대상
                                        </h3>
                                        <p style={cardTextStyle}>
                                            근로자 1명 이상인 모든
                                            사업장(정규직, 비정규직, 외국인 등)에
                                            적용됩니다.
                                        </p>
                                    </div>

                                    <div style={cardStyle}>
                                        <h3 style={cardTitleStyle}>
                                            사용자의 주지의무
                                        </h3>
                                        <p style={cardTextStyle}>
                                            사용자는 최저임금을 근로자가 쉽게 볼
                                            수 있는 장소에 게시해야 합니다.
                                        </p>
                                    </div>
                                </div>

                                {renderFAQ(faqData.wage)}
                            </div>
                        </div>
                    </>
                );

            case '근로계약서':
                return (
                    <>
                        <div
                            style={{
                                ...fullWidthWrapperStyle,
                                backgroundColor: '#4063ff',
                                color: '#ffffff'
                            }}
                        >
                            <div
                                style={{
                                    ...innerContainerStyle,
                                    paddingTop: '48px',
                                    paddingBottom: '32px'
                                }}
                            >
                                <p style={heroSubStyle}>
                                    근로기준법 제17조
                                </p>

                                <h1 style={heroTitleStyle}>
                                    함께 써요! 근로계약서!
                                </h1>
                            </div>
                        </div>

                        <div
                            style={{
                                ...fullWidthWrapperStyle,
                                flex: 1
                            }}
                        >
                            <div
                                style={{
                                    ...innerContainerStyle,
                                    padding: '56px 32px 80px'
                                }}
                            >
                                <h2 style={sectionTitleStyle}>
                                    근로계약서란?
                                </h2>

                                <p style={paragraphStyle}>
                                    근로자가 일을 하기 전에 고용주로부터 그
                                    대가를 지급받기로 서로 약속하고 작성하는
                                    근로 계약 문서입니다.
                                </p>

                                {renderFAQ(faqData.contract)}
                            </div>
                        </div>
                    </>
                );

            case '주휴수당':
                return (
                    <div style={{ ...fullWidthWrapperStyle, flex: 1 }}>
                        <div
                            style={{
                                ...innerContainerStyle,
                                padding: '56px 32px 80px'
                            }}
                        >
                            <h2 style={sectionTitleStyle}>
                                주휴수당 안내
                            </h2>

                            <p style={paragraphStyle}>
                                주휴수당 관련 내용을 준비 중입니다.
                            </p>

                            {renderFAQ(faqData.holiday)}
                        </div>
                    </div>
                );

            default:
                return (
                    <div
                        style={{
                            ...innerContainerStyle,
                            padding: '50px'
                        }}
                    >
                        준비 중인 페이지입니다.
                    </div>
                );
        }
    };

    return (
        <div style={pageWrapperStyle}>
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

            <div style={tabsContainerStyle}>
                <div style={tabsInnerStyle}>
                    {tabs.map((tab) => (
                        <button
                            type="button"
                            key={tab}
                            style={
                                tab === activeTab
                                    ? activeTabStyle
                                    : inactiveTabStyle
                            }
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {renderContent()}

            <footer style={footerStyle}>
                <div style={footerInnerStyle}>
                    <span style={footerTextStyle}>
                        자세한 사항은 국가법령정보센터에서 확인하실 수
                        있습니다.
                    </span>

                    <button
                        type="button"
                        style={footerBtnStyle}
                    >
                        {activeTab === '2026 최저시급'
                            ? '최저임금법 확인하기'
                            : '근로기준법 확인하기'}
                    </button>
                </div>
            </footer>

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

const pageWrapperStyle = {
    width: '100vw',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff'
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    minHeight: '64px',
    padding: '0 24px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #dddddd',
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
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#333333',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold'
};

const navBtnStyle = {
    padding: '8px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#444444',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500'
};

const btnStyle = {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #dddddd',
    borderRadius: '6px',
    color: '#444444',
    cursor: 'pointer',
    fontSize: '14px'
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    border: '1px solid #eeeeee',
    borderRadius: '50%',
    backgroundColor: '#ffffff'
};

const profileImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
};

const profileTextStyle = {
    color: '#333333',
    fontSize: '14px',
    fontWeight: 'bold'
};

const kakaoLoginBtnStyle = {
    height: '38px',
    minWidth: '154px',
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxSizing: 'border-box',
    backgroundColor: '#FEE500',
    border: 'none',
    borderRadius: '10px',
    color: '#191919',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
};

const kakaoLogoStyle = {
    width: '23px',
    height: '23px',
    display: 'block',
    flexShrink: 0
};

const kakaoLoginTextStyle = {
    color: '#191919',
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: 1
};

const fullWidthWrapperStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
};

const innerContainerStyle = {
    width: '100%',
    maxWidth: '960px',
    padding: '0 24px',
    boxSizing: 'border-box'
};

const tabsContainerStyle = {
    display: 'flex',
    borderBottom: '1px solid #eeeeee'
};

const tabsInnerStyle = {
    width: '100%',
    maxWidth: '960px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    boxSizing: 'border-box'
};

const tabBaseStyle = {
    padding: '20px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '15px',
    cursor: 'pointer'
};

const activeTabStyle = {
    ...tabBaseStyle,
    color: '#4063ff',
    fontWeight: 'bold',
    borderBottom: '3px solid #4063ff'
};

const inactiveTabStyle = {
    ...tabBaseStyle,
    color: '#888888'
};

const heroSubStyle = {
    marginBottom: '10px',
    fontSize: '14px',
    opacity: 0.8
};

const heroTitleStyle = {
    margin: '0 0 16px',
    fontSize: '32px',
    fontWeight: 'bold'
};

const heroDescStyle = {
    margin: 0,
    fontSize: '16px',
    lineHeight: '1.6',
    opacity: 0.9
};

const heroStatsGridStyle = {
    display: 'flex',
    maxWidth: '960px',
    margin: '32px auto 0',
    borderTop: '1px solid rgba(255,255,255,0.2)'
};

const heroStatItemStyle = {
    flex: 1,
    padding: '28px 0',
    textAlign: 'center',
    borderRight: '1px solid rgba(255,255,255,0.2)'
};

const heroStatLabelStyle = {
    marginBottom: '8px',
    fontSize: '14px',
    opacity: 0.8
};

const heroStatValueStyle = {
    fontSize: '22px',
    fontWeight: 'bold'
};

const sectionTitleStyle = {
    margin: '0 0 20px',
    color: '#111111',
    fontSize: '22px',
    fontWeight: 'bold'
};

const paragraphStyle = {
    margin: '0 0 32px',
    color: '#444444',
    fontSize: '15px',
    lineHeight: '1.7'
};

const threeColGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '24px',
    marginBottom: '40px'
};

const cardStyle = {
    padding: '32px 24px',
    backgroundColor: '#fafafa',
    border: '1px solid #f0f0f0',
    textAlign: 'center'
};

const cardTitleStyle = {
    margin: '0 0 16px',
    color: '#111111',
    fontSize: '16px',
    fontWeight: 'bold'
};

const cardTextStyle = {
    margin: '0 0 12px',
    color: '#333333',
    fontSize: '13px',
    lineHeight: '1.5'
};

const cardSmallTextStyle = {
    margin: 0,
    color: '#888888',
    fontSize: '11px',
    lineHeight: '1.5'
};

const faqSectionStyle = {
    marginTop: '48px'
};

const faqHeaderStyle = {
    margin: '0 0 16px',
    color: '#111111',
    fontSize: '18px',
    fontWeight: 'bold'
};

const faqItemStyle = {
    padding: '24px 0',
    borderBottom: '1px solid #eeeeee'
};

const faqQuestionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    color: '#333333',
    fontSize: '15px',
    fontWeight: 'bold'
};

const faqAnswerStyle = {
    color: '#666666',
    fontSize: '14px',
    lineHeight: '1.6'
};

const footerStyle = {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #eeeeee'
};

const footerInnerStyle = {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box'
};

const footerTextStyle = {
    color: '#888888',
    fontSize: '13px'
};

const footerBtnStyle = {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    color: '#555555',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
};

const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)'
};

const introModalStyle = {
    width: '380px',
    maxWidth: 'calc(100% - 40px)',
    padding: '32px',
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1px solid #222222',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
};

const closeIconBtnStyle = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999999',
    cursor: 'pointer',
    fontSize: '18px'
};

const introHeaderStyle = {
    marginTop: '8px',
    marginBottom: '28px',
    textAlign: 'center'
};

const coreValueBadgeStyle = {
    padding: '4px 10px',
    border: '1px solid #3b82f6',
    color: '#3b82f6',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px'
};

const introTitleStyle = {
    margin: '16px 0 8px',
    color: '#111111',
    fontSize: '20px',
    lineHeight: '1.4'
};

const introTitleAccentStyle = {
    color: '#3b82f6'
};

const introSubtitleStyle = {
    margin: 0,
    color: '#666666',
    fontSize: '13px'
};

const introFeatureListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};

const introFeatureStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
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
    color: '#111111',
    fontSize: '14px',
    fontWeight: 'bold'
};

const introFeatureDescStyle = {
    color: '#555555',
    fontSize: '12px',
    lineHeight: '1.5',
    wordBreak: 'keep-all'
};

const faqData = {
    wage: [
        {
            q: 'Q. 야간수당, 주휴수당 포함해서 최저시급 맞추면 되나요?',
            a: 'A. 아니요. 최저시급은 기본 시급만으로 산정합니다.'
        },
        {
            q: 'Q. 수습기간에는 최저시급보다 적게 받아도 되나요?',
            a: 'A. 1년 이상 계약직의 수습 3개월 동안은 최저시급의 90%까지 지급 가능합니다.'
        }
    ],
    contract: [
        {
            q: 'Q. 근로계약서를 안 쓰고 일하면 어떻게 되나요?',
            a: 'A. 계약서 미작성은 사업주의 위법입니다.'
        }
    ],
    holiday: [
        {
            q: 'Q. 매주 일하는 시간이 다르면 주휴수당은 어떻게 되나요?',
            a: 'A. 4주 동안 일한 총 근로시간을 평균 내어 계산합니다.'
        }
    ]
};

export default Guide;
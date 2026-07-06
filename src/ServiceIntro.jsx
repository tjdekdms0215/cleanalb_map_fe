import React from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceIntro = () => {
    const navigate = useNavigate();

    return (
        <div style={pageStyle}>
            {/* --- 1. 헤더 영역 --- */}
            <div style={headerStyle}>
                <div style={logoStyle} onClick={() => navigate('/')}>
                    전남대 클린알바맵
                </div>
                <div style={headerRightStyle}>
                    <button style={navBtnStyle}>📖 근로기준법 안내</button>
                    <button style={iconBtnStyle}>👤</button>
                    <button style={iconBtnStyle} onClick={() => navigate('/login')}>로그아웃 ➔</button>
                </div>
            </div>

            {/* --- 2. 메인 히어로(Hero) 영역 --- */}
            <div style={heroSectionStyle}>
                <div style={heroContentStyle}>
                    <span style={badgeStyle}>전남대 학생들을 위한 알바 환경 플랫폼</span>
                    <h1 style={heroTitleStyle}>
                        안전한 알바를 위한<br />
                        <span style={{ color: '#3b82f6' }}>전남대학교 근로환경 플랫폼</span>
                    </h1>
                    <p style={heroSubtitleStyle}>
                        솔직한 후기, 공정한 평가로<br />
                        더 나은 알바 문화를 만들어갑니다.
                    </p>
                </div>
                {/* 스마트폰 목업 (CSS로 형태만 구현, 나중에 이미지로 교체 가능) */}
                <div style={phoneMockupStyle}></div>
            </div>

            {/* --- 3. 성과(Achievement) 영역 --- */}
            <div style={sectionStyle}>
                <p style={sectionLabelStyle}>ACHIEVEMENT</p>
                <h2 style={sectionTitleStyle}>전남대 알바생이 직접 만드는 신뢰할 수 있는 알바 정보</h2>
                
                <div style={statsGridStyle}>
                    <div style={statCardStyle}>
                        <h3 style={statNumberStyle}>8개+</h3>
                        <p style={statTextStyle}>등록 사업장</p>
                    </div>
                    <div style={statCardStyle}>
                        <h3 style={statNumberStyle}>200개+</h3>
                        <p style={statTextStyle}>작성된 후기 수</p>
                    </div>
                    <div style={statCardStyle}>
                        <h3 style={statNumberStyle}>50명+</h3>
                        <p style={statTextStyle}>월간 방문자 수</p>
                    </div>
                    <div style={statCardStyle}>
                        <h3 style={statNumberStyle}>XX건</h3>
                        <p style={statTextStyle}>법 위반 신고</p>
                    </div>
                </div>
            </div>

            {/* --- 4. 핵심 가치(Core Value) 영역 --- */}
            <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                    <div>
                        <p style={sectionLabelStyle}>CORE VALUE</p>
                        <h2 style={sectionTitleStyle}>신뢰할 수 있는 알바 정보를 객관적으로 제공합니다</h2>
                    </div>
                    <button style={outlineBtnStyle} onClick={() => navigate('/')}>지도 열기 ➔</button>
                </div>

                <div style={valueGridStyle}>
                    <div style={valueCardStyle}>
                        <div style={valueNumberStyle}>01</div>
                        <div>
                            <h4 style={valueTitleStyle}>클린 지수 시각화</h4>
                            <p style={valueDescStyle}>사업장의 근로기준법 준수 여부를 100점 만점으로 점수화하고 컬러핀으로 지도에 표시해요.</p>
                        </div>
                    </div>
                    <div style={valueCardStyle}>
                        <div style={valueNumberStyle}>02</div>
                        <div>
                            <h4 style={valueTitleStyle}>인증 기반 후기</h4>
                            <p style={valueDescStyle}>실제 근로 증명 자료를 첨부해야만 후기를 작성할 수 있어요.</p>
                        </div>
                    </div>
                    <div style={valueCardStyle}>
                        <div style={valueNumberStyle}>03</div>
                        <div>
                            <h4 style={valueTitleStyle}>AI 후기 순화</h4>
                            <p style={valueDescStyle}>명예훼손 소지 표현을 LLM이 법적으로 안전한 언어로 자동 변환해 법적 리스크를 낮춰요.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 5. 하단 CTA(Call to Action) 영역 --- */}
            <div style={ctaSectionStyle}>
                <div>
                    <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#111' }}>안전한 알바, 지금 바로 시작하세요</h2>
                    <p style={{ margin: 0, color: '#666', fontSize: '15px' }}>전남대 인근 사업장의 클린 지수를 지도에서 직접 확인해보세요.</p>
                </div>
                <button style={primaryBtnStyle} onClick={() => navigate('/')}>지도 열기 ➔</button>
            </div>

            {/* --- 6. 푸터(Footer) 영역 --- */}
            <div style={footerStyle}>
                <span style={{ fontWeight: 'bold', color: '#555' }}>전남대 클린알바맵</span>
                <span style={{ color: '#999', fontSize: '13px' }}>© 2026 전남대 클린알바맵.</span>
            </div>
        </div>
    );
};

// --- 스타일 영역 ---

const pageStyle = {
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: 'sans-serif',
    overflowX: 'hidden'
};

/* 헤더 스타일 */
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    padding: '0 40px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff'
};
const logoStyle = { fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#111' };
const headerRightStyle = { display: 'flex', gap: '16px', alignItems: 'center' };
const navBtnStyle = { background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer' };
const iconBtnStyle = { background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };

/* 메인 히어로 스타일 */
const heroSectionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '100px 10vw',
    backgroundColor: '#f8fafc', // 아주 연한 파란/회색 배경
    borderBottom: '1px solid #eee'
};
const heroContentStyle = { flex: 1, maxWidth: '600px' };
const badgeStyle = {
    display: 'inline-block',
    backgroundColor: '#e0e7ff',
    color: '#3b82f6',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '20px'
};
const heroTitleStyle = { fontSize: '42px', fontWeight: '900', color: '#111', lineHeight: '1.3', margin: '0 0 24px 0', wordBreak: 'keep-all' };
const heroSubtitleStyle = { fontSize: '18px', color: '#555', lineHeight: '1.6', margin: 0 };

/* 폰 목업 스타일 (CSS로 그림) */
const phoneMockupStyle = {
    width: '260px',
    height: '520px',
    backgroundColor: '#f1f0ea', // 스크린샷의 폰 배경색과 유사하게
    border: '12px solid #1e293b', // 폰 테두리
    borderRadius: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    marginRight: '40px'
};

/* 공통 섹션 스타일 */
const sectionStyle = { padding: '80px 10vw' };
const sectionLabelStyle = { color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '12px' };
const sectionTitleStyle = { fontSize: '28px', fontWeight: 'bold', color: '#111', margin: '0 0 40px 0' };

/* 통계 카드 영역 (Achievement) */
const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px'
};
const statCardStyle = {
    backgroundColor: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '16px',
    padding: '40px 24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
};
const statNumberStyle = { fontSize: '36px', fontWeight: '900', color: '#111', margin: '0 0 8px 0' };
const statTextStyle = { fontSize: '15px', color: '#666', margin: 0 };

/* 핵심 가치 영역 (Core Value) */
const outlineBtnStyle = {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
    fontWeight: 'bold'
};
const valueGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '40px'
};
const valueCardStyle = { display: 'flex', gap: '16px', alignItems: 'flex-start' };
const valueNumberStyle = {
    backgroundColor: '#eee',
    color: '#555',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    flexShrink: 0
};
const valueTitleStyle = { fontSize: '18px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' };
const valueDescStyle = { fontSize: '14px', color: '#666', lineHeight: '1.6', margin: 0, wordBreak: 'keep-all' };

/* 하단 CTA 영역 */
const ctaSectionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '60px 10vw',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #eee',
    borderBottom: '1px solid #eee'
};
const primaryBtnStyle = {
    padding: '14px 28px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
};

/* 푸터 영역 */
const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 10vw',
    backgroundColor: '#fff'
};

export default ServiceIntro;
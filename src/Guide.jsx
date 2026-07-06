import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Guide = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('2026 최저시급');

    const tabs = ['2026 최저시급', '근로계약서', '주휴수당', '임금체불신고'];

    // 💡 각 탭별로 렌더링될 메인 콘텐츠 컴포넌트들
    const renderContent = () => {
        switch (activeTab) {
            case '2026 최저시급':
                return (
                    <>
                        <div style={heroStyle}>
                            <p style={heroSubStyle}>2026년 적용 기준</p>
                            <h1 style={heroTitleStyle}>2026년 최저시급 10,320원</h1>
                            <p style={heroDescStyle}>
                                최저임금 제도는 임금의 최저수준을 정하고, 이 수준 이상을 지급하도록<br />
                                법으로 강제하는 제도입니다.
                            </p>
                            
                            <div style={heroStatsGridStyle}>
                                <div style={heroStatItemStyle}>
                                    <div style={heroStatLabelStyle}>시급 1시간</div>
                                    <div style={heroStatValueStyle}>10,320원</div>
                                </div>
                                <div style={heroStatItemStyle}>
                                    <div style={heroStatLabelStyle}>일급 8시간</div>
                                    <div style={heroStatValueStyle}>82,560원</div>
                                </div>
                                <div style={heroStatItemStyle}>
                                    <div style={heroStatLabelStyle}>주급 40시간</div>
                                    <div style={heroStatValueStyle}>412,800원</div>
                                </div>
                                <div style={{ ...heroStatItemStyle, borderRight: 'none' }}>
                                    <div style={heroStatLabelStyle}>월급 209시간</div>
                                    <div style={heroStatValueStyle}>2,156,880원</div>
                                </div>
                            </div>
                        </div>

                        <div style={contentAreaStyle}>
                            <div style={threeColGridStyle}>
                                <div style={cardStyle}>
                                    <h3 style={cardTitleStyle}>최저임금액</h3>
                                    <p style={cardTextStyle}>2026년 적용 최저임금은<br/>시간당 10,320원입니다.</p>
                                    <p style={cardTextStyle}>수습기간 3개월은 최저시급의<br/>90%까지 감액 가능합니다.</p>
                                    <p style={cardSmallTextStyle}>단, 근로계약기간이 1년 미만이거나<br/>단순노무직 종사자에게는 최저시급을 감액할 수 없습니다.</p>
                                    <p style={{ ...cardTextStyle, fontWeight: 'bold', marginTop: '16px' }}>적용기간: 2026.1.1 ~ 2026.12.31</p>
                                </div>
                                <div style={cardStyle}>
                                    <h3 style={cardTitleStyle}>적용 대상</h3>
                                    <p style={cardTextStyle}>근로자 1명 이상인 모든 사업장에 적용됩니다.<br/>근로기준법상 근로자(정규직, 비정규직,<br/>외국인 등)이면 모두 해당됩니다.</p>
                                    <p style={cardSmallTextStyle}>단, 가사 사용인(가정부, 보모 등), 동거하는 친족만을<br/>사용하는 사업장에 종사하는 근로자는<br/>적용에서 제외됩니다.</p>
                                </div>
                                <div style={cardStyle}>
                                    <h3 style={cardTitleStyle}>사용자의 주지의무</h3>
                                    <p style={cardTextStyle}>사용자는 최저임금을<br/>근로자가 쉽게 볼 수 있는 장소에<br/>게시하거나 그 외 적당한 방법으로<br/>근로자에게 알려야 합니다.</p>
                                    <p style={cardSmallTextStyle}>최저임금 위반 시 3년 이하의 징역 또는 2<br/>천만원 이하의 벌금에 처해집니다.<br/>내용을 주지시키지 않을 경우에는<br/>100만원 이하의 과태료가 부과됩니다.</p>
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <h2 style={sectionTitleStyle}>최저임금 확인, 이렇게 확인하세요.</h2>
                                <p style={sectionDescStyle}>임금을 시급으로 환산한 금액과 최저임금 10,320원을 비교해보세요.</p>
                                
                                <div style={exampleListStyle}>
                                    <div style={exampleItemStyle}>
                                        <div style={exampleBadgeStyle}>시급</div>
                                        <div style={exampleDescStyle}>1시간에 9,060원의 시간급을 받은 경우</div>
                                        <div style={exampleCalcStyle}>10,030원 {'>'} 시간급 9,060원</div>
                                        <div style={exampleWarningStyle}>⚠ 최저임금 위반</div>
                                    </div>
                                    <div style={exampleItemStyle}>
                                        <div style={exampleBadgeStyle}>일급</div>
                                        <div style={exampleDescStyle}>1일 8시간 근로하고 일급 72,480원을 받은 경우</div>
                                        <div style={exampleCalcStyle}>10,030원 {'>'} 72,480원 ÷ 8시간 = 9,060원</div>
                                        <div style={exampleWarningStyle}>⚠ 최저임금 위반</div>
                                    </div>
                                    <div style={exampleItemStyle}>
                                        <div style={exampleBadgeStyle}>주급</div>
                                        <div style={exampleDescStyle}>1일 4시간, 1주(5일) 간 총 20시간 근로(개근)하고 주급 217,440원을 받은 경우</div>
                                        <div>
                                            <div style={exampleCalcStyle}>10,030원 {'>'} 217,440원 ÷ 24시간 = 9,060원</div>
                                            <div style={exampleSubCalcStyle}>* 주 15시간 이상 근무하는 경우 주휴수당을 포함하여 계산하여야 함</div>
                                        </div>
                                        <div style={exampleWarningStyle}>⚠ 최저임금 위반</div>
                                    </div>
                                    <div style={exampleItemStyle}>
                                        <div style={exampleBadgeStyle}>월급</div>
                                        <div style={exampleDescStyle}>월급 1,893,540원을 받고 1주 40시간(주 5일, 1일 8시간)을 근무한 경우</div>
                                        <div>
                                            <div style={exampleCalcStyle}>10,030원 {'>'} 1,893,540원 ÷ 209시간 = 9,060원</div>
                                            <div style={exampleSubCalcStyle}>* 주 소정근로시간 40시간 ➔ 월환산 기준 시간수 5*200시간</div>
                                        </div>
                                        <div style={exampleWarningStyle}>⚠ 최저임금 위반</div>
                                    </div>
                                </div>
                            </div>
                            {renderFAQ(faqData.wage)}
                        </div>
                    </>
                );
            case '근로계약서':
                return (
                    <>
                        <div style={heroStyle}>
                            <p style={heroSubStyle}>근로기준법 제17조</p>
                            <h1 style={heroTitleStyle}>함께 써요! 근로계약서!</h1>
                            <p style={heroDescStyle}>
                                근로기준법에 따라 사업주와 근로자는 근로계약을 체결해야 합니다.
                            </p>
                        </div>
                        <div style={contentAreaStyle}>
                            <h2 style={sectionTitleStyle}>근로계약서란?</h2>
                            <p style={paragraphStyle}>
                                근로자가 일을 하기 전에 고용주로부터 그 대가를 지급받기로 서로 약속하고 작성하는 근로 계약 문서로,<br />
                                임금·근로시간·휴일 등 주요 근로 조건들이 명시되어야 하며 작성하지 않을 경우 500만원 이하의 벌금이 부과됩니다.
                            </p>

                            <div style={infoBoxStyle}>
                                <h4 style={infoBoxTitleStyle}>제17조 (근로조건의 서면명시)</h4>
                                <p style={infoBoxTextStyle}>사용자는 기간제근로자 또는 단시간근로자와 근로계약을 체결하는 때에는 다음 각 호의 모든 사항을 서면으로 명시하여야 한다. 다만, 제4호는 단시간근로자에 한한다.</p>
                                <ul style={infoBoxListStyle}>
                                    <li>1. 근로계약기간에 관한 사항</li>
                                    <li>2. 근로시간·휴게에 관한 사항</li>
                                    <li>3. 임금의 구성항목·계산방법 및 지불방법에 관한 사항</li>
                                    <li>4. 휴일·휴가에 관한 사항</li>
                                    <li>5. 취업의 장소와 종사하여야 할 업무에 관한 사항</li>
                                    <li>6. 근로일 및 근로일별 근로시간</li>
                                </ul>
                            </div>
                            {renderFAQ(faqData.contract)}
                        </div>
                    </>
                );
            case '주휴수당':
                return (
                    <>
                        <div style={heroStyle}>
                            <p style={heroSubStyle}>근로기준법 제55조</p>
                            <h1 style={heroTitleStyle}>주휴수당, 알고 받으세요</h1>
                            <p style={heroDescStyle}>
                                1주일에 15시간 이상 근무하면 하루치 유급 휴일 임금을 받을 권리가 있습니다.
                            </p>
                        </div>
                        <div style={contentAreaStyle}>
                            <h2 style={sectionTitleStyle}>주휴수당이란?</h2>
                            <p style={paragraphStyle}>
                                1주일 동안 소정근로일을 모두 개근한 근로자에게 1주일에 평균 1회 이상 유급휴일을 주어야 합니다.<br/>
                                이 유급휴일에 지급되는 임금을 '주휴수당'이라고 합니다.
                            </p>

                            <div style={twoColGridStyle}>
                                <div style={cardStyle}>
                                    <h3 style={{...cardTitleStyle, textAlign: 'left'}}>계산 방법</h3>
                                    <ul style={bulletListStyle}>
                                        <li>주 5일 근무: 시급 × 8시간</li>
                                        <li>예) 시급 10,320원 × 8시간 = 82,560원 단시간 근로자의 경우</li>
                                        <li>(1주 소정근로시간 ÷ 40시간) × 8시간 × 시급  지각·조기퇴근은 결근이 아닙니다.</li>
                                    </ul>
                                </div>
                                <div style={cardStyle}>
                                    <h3 style={{...cardTitleStyle, textAlign: 'left'}}>주의사항</h3>
                                    <ul style={bulletListStyle}>
                                        <li>주 15시간 미만 근로자는 주휴수당 적용 제외</li>
                                        <li>무단결근 시 해당 주 주휴수당 미지급 가능</li>
                                        <li>두 곳에서 알바 시 각각 사업장에서 지급 의무</li>
                                        <li>주휴수당 미지급은 임금체불로 신고 가능</li>
                                    </ul>
                                </div>
                            </div>
                            {renderFAQ(faqData.holiday)}
                        </div>
                    </>
                );
            case '임금체불신고':
                return (
                    <>
                        <div style={heroStyle}>
                            <p style={heroSubStyle}>임금체불 대처법</p>
                            <h1 style={heroTitleStyle}>월급을 못 받았다면? 신고하세요</h1>
                            <p style={heroDescStyle}>
                                임금체불은 명백한 범죄입니다.<br />
                                3년 이하 징역 또는 3천만원 이하 벌금에 처해집니다.
                            </p>
                        </div>
                        <div style={contentAreaStyle}>
                            <h2 style={sectionTitleStyle}>임금체불이란?</h2>
                            <p style={paragraphStyle}>
                                임금을 지급일에 지급하지 않거나 일부만 지급하는 행위입니다.<br/>
                                • 매월 1회 이상 정해진 날 전액 지급 의무 • 퇴직 후 14일 이내 지급 의무<br/>
                                • 지연 지급 시 연 20% 지연이자 청구 가능 • 현금·근로자 명의 계좌로 지급
                            </p>

                            <div style={twoColGridStyle}>
                                <div style={cardStyle}>
                                    <h3 style={cardTitleStyle}>신고 방법</h3>
                                    <div style={centerListStyle}>
                                        <p>1. 고용노동부 상담 전화 1350</p>
                                        <p>2. 고용노동부 홈페이지 온라인 진정</p>
                                        <p>3. 가까운 지방고용노동청 방문</p>
                                        <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                                            4. 대한법률구조공단 법률 지원 신고 시 필요 서류 :<br/>
                                            근로계약서, 급여 명세서, 통장내역, 출퇴근 기록 등
                                        </p>
                                    </div>
                                </div>
                                <div style={cardStyle}>
                                    <h3 style={cardTitleStyle}>대처 순서</h3>
                                    <div style={centerListStyle}>
                                        <p>1단계: 사업주에게 서면으로 지급 요청</p>
                                        <p>2단계: 내용증명 발송</p>
                                        <p>3단계: 고용노동부 임금체불 진정 신고</p>
                                        <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                                            4단계: 검찰 고소 퇴직 후 3년 이내 청구 가능 소액 체불은<br/>소액심판제도 활용 가능
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {renderFAQ(faqData.wage)} 
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    const renderFAQ = (faqs) => (
        <div style={faqSectionStyle}>
            <h3 style={faqHeaderStyle}>자주 묻는 질문</h3>
            {faqs.map((faq, idx) => (
                <div key={idx} style={faqItemStyle}>
                    <div style={faqQuestionStyle}>
                        <span>{faq.q}</span>
                        <span style={{ color: '#ccc' }}>^</span>
                    </div>
                    <div style={faqAnswerStyle}>{faq.a}</div>
                </div>
            ))}
        </div>
    );

    return (
        <div style={pageWrapperStyle}>
            <div style={containerStyle}>
                
                {/* 헤더 영역 */}
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

                {/* 탭 메뉴 영역 */}
                <div style={tabsContainerStyle}>
                    {tabs.map((tab) => (
                        <div 
                            key={tab} 
                            style={tab === activeTab ? activeTabStyle : inactiveTabStyle}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>

                {/* 메인 콘텐츠 영역 */}
                {renderContent()}

                {/* 공통 푸터(CTA) 영역 */}
                <div style={footerStyle}>
                    <span style={{ color: '#888', fontSize: '14px' }}>
                        자세한 사항은 국가법령정보센터에서 확인하실 수 있습니다.
                    </span>
                    <button style={footerBtnStyle}>
                        {activeTab === '2026 최저시급' ? '최저임금법 확인하기' : '근로기준법 확인하기'}
                    </button>
                </div>

            </div>
        </div>
    );
};

// --- 더미 데이터 영역 ---
const faqData = {
    wage: [
        { q: 'Q. 야간수당, 주휴수당 포함해서 최저시급 맞추면 되나요?', a: 'A. 아니요. 최저시급은 기본 시급만으로 산정합니다. 야간수당, 주휴수당 등 법정 가산수당은 별도로 지급해야 합니다.' },
        { q: 'Q. 수습기간에는 최저시급보다 적게 받아도 되나요?', a: 'A. 1년 이상 계약직의 수습 3개월 동안은 최저시급의 90%까지 지급 가능합니다. 단, 1년 미만 계약이나 단순노무직은 감액 불가합니다.' },
        { q: 'Q. 사장님이 식비, 교통비를 최저시급에 포함한다고 하는데 맞나요?', a: 'A. 매월 정기적으로 지급되는 식비·교통비 중 일부는 최저임금에 산입될 수 있으나 비율에 제한이 있습니다. 자세한 사항은 고용노동부(1350)에 문의하세요.' }
    ],
    contract: [
        { q: 'Q. 근로계약서를 안 쓰고 일하면 어떻게 되나요?', a: 'A. 계약서 미작성은 사업주의 위법입니다. 근로관계는 성립하므로 임금 청구는 가능하나 분쟁 시 증거가 없어 불리할 수 있습니다.' },
        { q: 'Q. 계약 내용을 중간에 바꾸자고 하는데 거부할 수 있나요?', a: 'A. 근로조건 변경은 양측 합의가 필요합니다. 사업주가 일방적으로 변경하는 것은 위법입니다.' },
        { q: 'Q. 단기 알바도 근로계약서를 써야 하나요?', a: 'A. 네. 근무 기간이 하루여도 근로계약서 작성 의무가 있습니다. 일용직·아르바이트 모두 해당됩니다.' }
    ],
    holiday: [
        { q: 'Q. 매주 일하는 시간이 다르면 주휴수당은 어떻게 되나요?', a: 'A. 4주 동안 일한 총 근로시간을 평균 내어 계산합니다. 이렇게 계산한 1주 평균 근로시간이 15시간 이상이라면, 일한 시간에 비례하여 단시간 근로자 계산법으로 주휴수당을 받을 수 있습니다' },
        { q: 'Q. 주휴일이랑 공휴일이 겹치면 돈을 두 배로 받나요?', a: 'A. 원칙적으로 하나의 휴일로 취급되어 주휴수당 한 번만 지급됩니다. 단, 그날 실제로 출근해서 일을 했다면 휴일 근로수당이 추가로 발생할 수 있습니다.' },
        { q: 'Q. 한 주에 15시간은 어떻게 계산하나요?', a: 'A. 소정근로시간(약속된 근로시간) 기준으로 계산합니다. 초과근무 시간은 포함되지 않습니다.' }
    ]
};


// --- 스타일 영역 ---

/* 전체 배경 및 컨테이너 */
const pageWrapperStyle = {
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: '#4b4b4b', // 스크린샷 밖의 다크 그레이 배경
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0',
    fontFamily: 'sans-serif'
};
const containerStyle = {
    width: '1000px',
    backgroundColor: '#ffffff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column'
};

/* 헤더 영역 */
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    padding: '0 40px',
    borderBottom: '1px solid #eee'
};
const logoStyle = { fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#111' };
const headerRightStyle = { display: 'flex', gap: '16px', alignItems: 'center' };
const navBtnStyle = { background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer' };
const iconBtnStyle = { background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };

/* 탭 메뉴 영역 */
const tabsContainerStyle = {
    display: 'flex',
    padding: '0 40px',
    borderBottom: '1px solid #eee'
};
const tabBaseStyle = {
    padding: '20px 24px',
    fontSize: '15px',
    cursor: 'pointer',
    position: 'relative'
};
const activeTabStyle = {
    ...tabBaseStyle,
    color: '#4063ff',
    fontWeight: 'bold',
    borderBottom: '3px solid #4063ff'
};
const inactiveTabStyle = {
    ...tabBaseStyle,
    color: '#888'
};

/* 히어로 영역 (블루 배경) */
const heroStyle = {
    backgroundColor: '#4063ff',
    color: '#fff',
    padding: '50px 40px 0 40px',
    display: 'flex',
    flexDirection: 'column'
};
const heroSubStyle = { fontSize: '13px', opacity: 0.8, marginBottom: '12px' };
const heroTitleStyle = { fontSize: '32px', fontWeight: 'bold', margin: '0 0 16px 0' };
const heroDescStyle = { fontSize: '15px', lineHeight: '1.6', opacity: 0.9, margin: '0 0 40px 0' };

/* 히어로 통계 그리드 (첫번째 탭 전용) */
const heroStatsGridStyle = {
    display: 'flex',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    margin: '0 -40px', // 좌우 패딩 상쇄해서 꽉 차게
};
const heroStatItemStyle = {
    flex: 1,
    padding: '24px 0',
    textAlign: 'center',
    borderRight: '1px solid rgba(255,255,255,0.2)'
};
const heroStatLabelStyle = { fontSize: '13px', opacity: 0.8, marginBottom: '8px' };
const heroStatValueStyle = { fontSize: '20px', fontWeight: 'bold' };

/* 메인 콘텐츠 공통 영역 */
const contentAreaStyle = {
    padding: '60px 40px',
    backgroundColor: '#fff'
};
const sectionStyle = { marginTop: '60px' };
const sectionTitleStyle = { fontSize: '20px', fontWeight: 'bold', color: '#111', margin: '0 0 12px 0' };
const sectionDescStyle = { fontSize: '14px', color: '#666', marginBottom: '24px' };
const paragraphStyle = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 40px 0' };

/* 그리드 및 카드 스타일 */
const threeColGridStyle = { display: 'flex', gap: '24px', marginBottom: '40px' };
const twoColGridStyle = { display: 'flex', gap: '24px', marginBottom: '40px' };
const cardStyle = {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: '32px 24px',
    textAlign: 'center',
    border: '1px solid #f0f0f0'
};
const cardTitleStyle = { fontSize: '16px', fontWeight: 'bold', color: '#111', margin: '0 0 20px 0' };
const cardTextStyle = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px 0' };
const cardSmallTextStyle = { fontSize: '12px', color: '#888', lineHeight: '1.6', margin: 0 };

/* 제17조 박스 스타일 (근로계약서 탭) */
const infoBoxStyle = {
    backgroundColor: '#f8fafc',
    padding: '32px',
    borderRadius: '8px',
    marginBottom: '40px'
};
const infoBoxTitleStyle = { fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#111' };
const infoBoxTextStyle = { fontSize: '14px', color: '#444', marginBottom: '20px' };
const infoBoxListStyle = { listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#555', display: 'flex', flexWrap: 'wrap', gap: '12px 24px' };

/* 중앙 정렬 리스트 (임금체불신고 탭) */
const centerListStyle = { fontSize: '14px', color: '#444', lineHeight: '1.8' };
const bulletListStyle = { fontSize: '14px', color: '#444', lineHeight: '1.8', textAlign: 'left', margin: 0, paddingLeft: '20px' };

/* 최저임금 계산 예시 리스트 */
const exampleListStyle = { display: 'flex', flexDirection: 'column', gap: '0' };
const exampleItemStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    padding: '24px 0', 
    borderBottom: '1px solid #eee' 
};
const exampleBadgeStyle = { 
    backgroundColor: '#a3a3a3', color: '#fff', 
    width: '40px', height: '40px', borderRadius: '50%', 
    display: 'flex', justifyContent: 'center', alignItems: 'center', 
    fontSize: '13px', fontWeight: 'bold', flexShrink: 0, marginRight: '24px' 
};
const exampleDescStyle = { flex: 1, fontSize: '13px', color: '#777' };
const exampleCalcStyle = { flex: 1.2, fontSize: '14px', fontWeight: 'bold', color: '#333' };
const exampleSubCalcStyle = { fontSize: '11px', color: '#999', marginTop: '4px' };
const exampleWarningStyle = { width: '100px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#e11d48' };

/* FAQ 영역 */
const faqSectionStyle = { marginTop: '60px' };
const faqHeaderStyle = { fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#111' };
const faqItemStyle = { borderBottom: '1px solid #eee', padding: '20px 0' };
const faqQuestionStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '12px' };
const faqAnswerStyle = { fontSize: '13px', color: '#666', lineHeight: '1.6' };

/* 하단 푸터 (확인하기 버튼 영역) */
const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '32px 40px',
    borderTop: '1px solid #eee',
    backgroundColor: '#fff'
};
const footerBtnStyle = {
    backgroundColor: '#f1f5f9',
    color: '#555',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default Guide;
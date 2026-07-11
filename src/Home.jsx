import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://cleanalb-map.duckdns.org';

// 💡 더미 데이터(DUMMY_STORES)는 이제 안녕! 서버에서 직접 받아올 거니까 삭제했어.

const getCleanGradeInfo = (score) => {
    // 혹시 점수가 null이거나 없을 때를 대비한 방어 코드
    if (score === null || score === undefined) return { color: '#999999', label: '미정' }; 
    if (score >= 80) return { color: '#009900', label: '우수' };
    if (score >= 60) return { color: '#FFC000', label: '보통' };
    if (score >= 40) return { color: '#FF6600', label: '주의' };
    return { color: '#DD0000', label: '위험' };
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

    // 💡 [API 연동 핵심] 사업장 목록 및 검색 데이터를 백엔드에서 가져오는 함수
    const fetchWorkspaces = async (keyword = '') => {
        try {
            // 키워드가 있으면 검색 API로, 없으면 전체 목록 API로 호출
            // (백엔드 파라미터명에 따라 ?keyword= 또는 ?name= 등으로 수정될 수 있어)
            const url = keyword 
                ? `${API_BASE_URL}/workspaces?keyword=${encodeURIComponent(keyword)}` 
                : `${API_BASE_URL}/workspaces`;
                
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                // 백엔드 응답이 배열 형태라고 가정하고 상태에 저장
                setStores(data);
            } else {
                console.error("사업장 데이터를 불러오는데 실패했습니다.");
            }
        } catch (error) {
            console.error("API 연동 에러:", error);
        }
    };

    // 화면이 처음 렌더링될 때 전체 사업장 데이터를 가져옴
    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const savedNickname = localStorage.getItem('user_nickname');
        const userRole = localStorage.getItem('user_role');

        if (token) {
            setIsLoggedIn(true);
            if (savedNickname) setNickname(savedNickname);
            if (userRole === 'ADMIN') setIsAdmin(true);
        }
        
        // 💡 컴포넌트 마운트 시 최초 데이터 로출
        fetchWorkspaces();
    }, []);

    // 💡 [수정됨] stores 데이터가 바뀔 때마다 마커를 새로 그리는 로직
    useEffect(() => {
        if (!window.kakao || !window.kakao.maps || stores.length === 0) return;

        const container = document.getElementById('kakao-map');
        if (!container) return;

        const options = { center: new window.kakao.maps.LatLng(35.1764, 126.9135), level: 4 };
        const map = new window.kakao.maps.Map(container, options);

        stores.forEach((store) => {
            // 백엔드 변수명에 맞춰서 cleanScore, latitude, longitude 적용
            const score = store.cleanScore; 
            const lat = store.latitude;
            const lng = store.longitude;

            // 좌표가 없으면 핀을 그릴 수 없으니 건너뛰기
            if (!lat || !lng) return;

            const { color } = getCleanGradeInfo(score);
            const svgMarker = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 24 35"><path fill="${color}" d="M12 0C5.373 0 0 5.373 0 12c0 7.747 12 23 12 23s12-15.253 12-23C24 5.373 18.627 0 12 0zm0 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/></svg>`;
            const markerImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarker)}`;
            const markerImage = new window.kakao.maps.MarkerImage(markerImageUrl, new window.kakao.maps.Size(28, 40));
            const markerPosition = new window.kakao.maps.LatLng(lat, lng);
            
            const marker = new window.kakao.maps.Marker({ position: markerPosition, image: markerImage });
            marker.setMap(map);

            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedStore(store);
            });
        });
    }, [stores]);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setNickname('');
        setIsAdmin(false);
        alert('로그아웃 되었습니다.');
    };

    // 💡 [검색 API 연동] 기존 프론트엔드 필터링에서 백엔드 검색 요청으로 변경!
    const executeSearch = () => {
        const keyword = searchTerm.trim();
        fetchWorkspaces(keyword);
        setSelectedStore(null);
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    };

    return (
        <div style={pageStyle}>
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button style={logoBtnStyle} onClick={() => navigate('/')}>전남대 클린알바맵</button>
                    <button style={navBtnStyle} onClick={() => setShowIntroModal(true)}>서비스 소개</button>
                    <button style={navBtnStyle} onClick={() => navigate('/guide')}>근로기준법 안내</button>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isLoggedIn ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                                <div style={profileCircleStyle}>
                                    <img src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                {nickname && <span style={profileTextStyle}>{nickname}님</span>}
                            </div>
                            {isAdmin && <button onClick={() => navigate('/admin')} style={adminBtnStyle}>⚙️ 관리자</button>}
                            <button onClick={handleLogout} style={btnStyle}>로그아웃</button>
                        </>
                    ) : (
                        <button onClick={() => navigate('/login')} style={btnStyle}>로그인</button>
                    )}
                </div>
            </div>

            <div style={contentStyle}>
                <div style={mapContainerStyle}>
                    <div id="kakao-map" style={{ width: '100%', height: '100%' }} />
                    
                    <div style={legendBoxStyle}>
                        <div style={legendRowStyle}><span style={{...legendDotStyle, backgroundColor: '#009900'}}></span> 80+ 우수</div>
                        <div style={legendRowStyle}><span style={{...legendDotStyle, backgroundColor: '#FFC000'}}></span> 60~79 보통</div>
                        <div style={legendRowStyle}><span style={{...legendDotStyle, backgroundColor: '#FF6600'}}></span> 40~59 주의</div>
                        <div style={legendRowStyle}><span style={{...legendDotStyle, backgroundColor: '#DD0000'}}></span> 40미만 위험</div>
                    </div>

                    {/* 💡 [수정됨] 백엔드 변수명(cleanScore, district, category 등)에 맞춰 팝업 데이터 렌더링 */}
                    {selectedStore && (
                        <div style={popupStyle}>
                            <button onClick={() => setSelectedStore(null)} style={closeIconBtnStyle}>✕</button>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <span style={{
                                    ...tagStatusStyle, 
                                    backgroundColor: '#fff', 
                                    color: getCleanGradeInfo(selectedStore.cleanScore).color,
                                    border: `1px solid ${getCleanGradeInfo(selectedStore.cleanScore).color}`
                                }}>
                                    {getCleanGradeInfo(selectedStore.cleanScore).label}
                                </span>
                            </div>

                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#333' }}>
                                {selectedStore.name}
                            </h3>
                            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
                                {selectedStore.district} • {selectedStore.category}
                            </p>

                            <div style={grayBoxStyle}>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>클린 점수:</span>
                                    <span style={{ fontWeight: 'bold', color: getCleanGradeInfo(selectedStore.cleanScore).color }}>
                                        {selectedStore.cleanScore ? `${selectedStore.cleanScore}점` : '점수 없음'}
                                    </span>
                                </div>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>산출 근거:</span>
                                    {/* 백엔드에 아직 oxStats 데이터가 없다면 기본값 표시 */}
                                    <span>{selectedStore.oxStats || '수집된 근거 데이터가 없습니다.'}</span>
                                </div>
                            </div>

                            <div style={tintedBoxStyle}>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>누적 후기:</span>
                                    <span>{selectedStore.reviewCount || 0}명 참여</span>
                                </div>
                                <div style={boxRowStyle}>
                                    <span style={boxLabelStyle}>후기 요약:</span>
                                    <span style={{ lineHeight: '1.3' }}>
                                        {selectedStore.reviewSummary || '아직 요약된 후기가 없습니다.'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                {/* id 대신 백엔드 고유 ID인 workspaceId 사용 */}
                                <button onClick={() => navigate(`/detail/${selectedStore.workspaceId}`)} style={modernDetailBtnStyle}>
                                    후기 자세히 보기 ➔
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <button onClick={() => navigate('/review/write')} style={fabStyle}>후기 쓰기</button>
                </div>

                <div style={sidebarStyle}>
                    <div style={sidebarHeaderAreaStyle}>
                        <div style={searchContainerStyle}>
                            <input
                                type="text"
                                placeholder="사업장 이름 및 원하는 조건 검색"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                                style={sidebarSearchInputStyle}
                            />
                            <span style={searchIconStyle} onClick={executeSearch}>🔍</span>
                        </div>
                        <div style={searchExampleTextStyle}>
                            💡 조건 ex) 상대에 클린점수 60점 넘는 카페 찾아줘
                        </div>
                    </div>

                    <div style={listTitleAreaStyle}>
                        <h2 style={{ fontSize: '18px', margin: 0 }}>클린 사업장 리스트</h2>
                        <span style={{ fontSize: '13px', color: '#888', fontWeight: 'bold' }}>전체 {stores.length}건</span>
                    </div>
                    
                    <div style={listContainerStyle}>
                        {stores.length > 0 ? (
                            stores.map((store) => (
                                // 반복문 key는 고유 식별자인 workspaceId로 설정
                                <div key={store.workspaceId} style={listItemStyle} onClick={() => setSelectedStore(store)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={storeNameStyle}>
                                            {store.name}
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: getCleanGradeInfo(store.cleanScore).color }}>
                                            {store.cleanScore}점
                                        </div>
                                    </div>
                                    <div style={storeInfoStyle}>
                                        {store.district} • {store.category}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={emptyStyle}>검색 결과가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 서비스 소개 팝업 (모달) 영역 */}
            {showIntroModal && (
                <div style={modalOverlayStyle} onClick={() => setShowIntroModal(false)}>
                    <div style={introModalStyle} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowIntroModal(false)} style={closeIconBtnStyle}>✕</button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '28px', marginTop: '8px' }}>
                            <span style={{ border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 10px', borderRadius: '0', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                CORE VALUE
                            </span>
                            <h2 style={{ fontSize: '20px', color: '#111', margin: '16px 0 8px 0', lineHeight: '1.4' }}>
                                안전한 알바를 위한<br />
                                <span style={{ color: '#3b82f6' }}>전남대 클린알바맵</span>
                            </h2>
                            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                                솔직한 후기, 공정한 평가로 더 나은 문화를 만듭니다.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>01</div>
                                <div>
                                    <div style={introFeatureTitleStyle}>클린 지수 시각화</div>
                                    <div style={introFeatureDescStyle}>사업장의 근로기준법 준수 여부를 100점 만점으로 점수화해 컬러 핀으로 표시합니다.</div>
                                </div>
                            </div>
                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>02</div>
                                <div>
                                    <div style={introFeatureTitleStyle}>인증 기반 후기</div>
                                    <div style={introFeatureDescStyle}>실제 근로 증명 자료를 첨부해야만 후기를 작성할 수 있어 객관적이고 신뢰할 수 있습니다.</div>
                                </div>
                            </div>
                            <div style={introFeatureStyle}>
                                <div style={introFeatureIconStyle}>03</div>
                                <div>
                                    <div style={introFeatureTitleStyle}>AI 후기 순화</div>
                                    <div style={introFeatureDescStyle}>명예훼손 소지 표현을 LLM이 안전한 언어로 자동 변환해 작성자의 법적 리스크를 낮춥니다.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 스타일 영역 ---
// (기존 스타일과 완벽히 동일하게 유지)
const pageStyle = { width: '100vw', height: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #ddd', zIndex: 10 };
const logoBtnStyle = { backgroundColor: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#333' };
const navBtnStyle = { backgroundColor: 'transparent', border: 'none', padding: '8px 10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#444' };
const btnStyle = { backgroundColor: 'transparent', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', color: '#444' };
const adminBtnStyle = { ...btnStyle, color: 'red', borderColor: 'red', fontWeight: 'bold' };
const profileTextStyle = { fontSize: '14px', fontWeight: 'bold', color: '#333' };
const profileCircleStyle = { width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #eee', backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' };

const contentStyle = { display: 'flex', flex: 1, overflow: 'hidden' };
const mapContainerStyle = { flex: 1, position: 'relative', backgroundColor: '#e9ecef' };

const legendBoxStyle = { position: 'absolute', bottom: '24px', left: '24px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', padding: '16px', zIndex: 15, display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const legendRowStyle = { display: 'flex', alignItems: 'center', fontSize: '15px', color: '#444', fontWeight: '500' };
const legendDotStyle = { width: '14px', height: '14px', borderRadius: '50%', marginRight: '10px' };

const sidebarStyle = { width: '400px', backgroundColor: '#ffffff', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', zIndex: 5 };
const sidebarHeaderAreaStyle = { padding: '20px 20px 14px 20px', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa' };

const listTitleAreaStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px 20px 16px 20px', borderBottom: '1px solid #eee' };
const searchContainerStyle = { position: 'relative', width: '100%' };
const sidebarSearchInputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 14px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '15px' };
const searchIconStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '18px' };
const searchExampleTextStyle = { fontSize: '12px', color: '#777', marginTop: '10px', paddingLeft: '4px', lineHeight: '1.4', fontWeight: '500' };

const listContainerStyle = { overflowY: 'auto', flex: 1 };
const listItemStyle = { padding: '20px', borderBottom: '1px solid #eee', cursor: 'pointer' };
const storeNameStyle = { fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const storeInfoStyle = { fontSize: '14px', color: '#666', marginTop: '8px', fontWeight: '500' };
const emptyStyle = { padding: '24px', color: '#777', fontSize: '14px', textAlign: 'center' };

const fabStyle = { position: 'absolute', top: '24px', left: '24px', width: '100px', height: '40px', backgroundColor: '#ffffff', color: 'black', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 15 };

const popupStyle = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '16px', borderRadius: '0', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 20, width: '280px', display: 'flex', flexDirection: 'column' };
const closeIconBtnStyle = { position: 'absolute', top: '12px', right: '12px', backgroundColor: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' };
const tagStatusStyle = { padding: '3px 6px', borderRadius: '0', fontSize: '11px', fontWeight: 'bold' };

const grayBoxStyle = { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '0', marginBottom: '6px', border: '1px solid #eee' }; 
const tintedBoxStyle = { backgroundColor: '#fff8f0', padding: '10px', borderRadius: '0', border: '1px solid #fde7d8' }; 
const boxRowStyle = { display: 'flex', alignItems: 'flex-start', fontSize: '12px', color: '#333', marginBottom: '4px' }; 
const boxLabelStyle = { minWidth: '60px', fontWeight: 'bold', color: '#555' };

const modernDetailBtnStyle = { backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '0', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const introModalStyle = { backgroundColor: '#fff', width: '380px', padding: '32px', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', borderRadius: '0', border: '1px solid #222' };
const introFeatureStyle = { display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px', backgroundColor: '#fdfdfd', borderRadius: '0', border: '1px solid #eaeaea' };
const introFeatureIconStyle = { backgroundColor: '#3b82f6', color: '#fff', width: '28px', height: '28px', borderRadius: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 };
const introFeatureTitleStyle = { fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '4px' };
const introFeatureDescStyle = { fontSize: '12px', color: '#555', lineHeight: '1.5', wordBreak: 'keep-all' };

export default Home;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DUMMY_STORES = [
    {
        id: 1,
        name: '전대 후문 맘스터치',
        cleanIndex: 98,
        lat: 35.1764,
        lng: 126.9135,
        issue: '클린 사업장!',
        oxStats: '근로계약서 O (12건) / 주휴수당 O (12건)',
        reviewCount: 12,
        frequentJobs: ['홀 서빙', '주방 보조']
    },
    {
        id: 2,
        name: '정문 ㅇㅇ편의점',
        cleanIndex: 45,
        lat: 35.1750,
        lng: 126.9100,
        issue: '주휴수당 미지급 의심',
        oxStats: '근로계약서 X (3건) / 주휴수당 X (5건)',
        reviewCount: 8,
        frequentJobs: ['야간 카운터', '주말 오전 매장관리']
    },
    {
        id: 3,
        name: '상대 ㅁㅁ카페',
        cleanIndex: 85,
        lat: 35.1780,
        lng: 126.9080,
        issue: '근로계약서 작성 완료',
        oxStats: '근로계약서 O (5건) / 주휴수당 미해당',
        reviewCount: 5,
        frequentJobs: ['오픈 미들 파트타이머']
    }
];

const Home = () => {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const [stores, setStores] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const savedNickname = localStorage.getItem('user_nickname');
        const userRole = localStorage.getItem('user_role');

        if (token) {
            setIsLoggedIn(true);
            if (savedNickname) setNickname(savedNickname);
            if (userRole === 'ADMIN') setIsAdmin(true);
        }

        const sortedStores = [...DUMMY_STORES].sort(
            (a, b) => b.cleanIndex - a.cleanIndex
        );
        setStores(sortedStores);
    }, []);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) return;

        const container = document.getElementById('kakao-map');
        if (!container) return;

        const options = {
            center: new window.kakao.maps.LatLng(35.1764, 126.9135),
            level: 4
        };

        const map = new window.kakao.maps.Map(container, options);

        stores.forEach((store) => {
            const markerPosition = new window.kakao.maps.LatLng(store.lat, store.lng);
            const marker = new window.kakao.maps.Marker({ position: markerPosition });
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

    const handleSearch = (e) => {
        if (e.key !== 'Enter') return;

        const keyword = searchTerm.trim();

        if (keyword === '') {
            const sortedStores = [...DUMMY_STORES].sort((a, b) => b.cleanIndex - a.cleanIndex);
            setStores(sortedStores);
            setSelectedStore(null);
            return;
        }

        const filteredStores = DUMMY_STORES
            .filter((store) => store.name.includes(keyword))
            .sort((a, b) => b.cleanIndex - a.cleanIndex);

        setStores(filteredStores);
        setSelectedStore(null);
    };

    return (
        <div style={pageStyle}>
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button style={logoBtnStyle} onClick={() => navigate('/')}>
                        전남대 클린알바맵
                    </button>
                    <button style={navBtnStyle}>서비스 소개</button>
                    <button style={navBtnStyle}>근로기준법 안내</button>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isLoggedIn ? (
                        <>
                            {/* 💡 [수정됨] 동그란 프로필 이미지와 닉네임을 하나로 묶음! 누르면 프로필 페이지로 이동 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                                <div style={profileCircleStyle}>
                                    <img 
                                        src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" 
                                        alt="프로필" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                </div>
                                {nickname && <span style={profileTextStyle}>{nickname}님</span>}
                            </div>
                            
                            {isAdmin && <button onClick={() => navigate('/admin')} style={adminBtnStyle}>⚙️ 관리자</button>}
                            
                            {/* 💡 [수정됨] '내 프로필' 버튼을 지우고 로그아웃 버튼만 남김 */}
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

                    {selectedStore && (
                        <div style={popupStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{selectedStore.name}</h3>
                                <button onClick={() => setSelectedStore(null)} style={closeIconBtnStyle}>✕</button>
                            </div>
                            <div style={infoRowStyle}>
                                <span style={infoLabelStyle}>🏆 종합 점수</span>
                                <span style={{ fontWeight: 'bold', color: '#007AFF' }}>{selectedStore.cleanIndex}점</span>
                            </div>
                            <div style={infoRowStyle}>
                                <span style={infoLabelStyle}>📊 산출 근거</span>
                                <span style={{ fontSize: '13px', color: '#555' }}>{selectedStore.oxStats}</span>
                            </div>
                            <div style={infoRowStyle}>
                                <span style={infoLabelStyle}>✍️ 누적 후기</span>
                                <span style={{ fontSize: '13px', color: '#555' }}>{selectedStore.reviewCount}명 참여</span>
                            </div>
                            <div style={{ ...infoRowStyle, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <span style={infoLabelStyle}>📢 자주 올라오는 공고</span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    {selectedStore.frequentJobs.map((job, idx) => (
                                        <span key={idx} style={tagStyle}>{job}</span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => navigate(`/detail/${selectedStore.id}`)} style={detailBtnStyle}>
                                후기 자세히 보기
                            </button>
                        </div>
                    )}

                    <button onClick={() => navigate('/review/write')} style={fabStyle}>
                        후기 쓰기
                    </button>
                </div>

                <div style={sidebarStyle}>
                    <div style={sidebarHeaderAreaStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '18px', margin: 0 }}> 클린 사업장 리스트</h2>
                            <span style={{ fontSize: '13px', color: '#888', fontWeight: 'bold' }}>
                                전체 {stores.length}건
                            </span>
                        </div>
                        
                        <input
                            type="text"
                            placeholder="사업장 이름 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            style={sidebarSearchInputStyle}
                        />
                    </div>

                    <div style={listContainerStyle}>
                        {stores.length > 0 ? (
                            stores.map((store, index) => (
                                <div key={store.id} style={listItemStyle} onClick={() => setSelectedStore(store)}>
                                    {/* 💡 가게 이름이 안 보이길래 복구해 뒀어! */}
                                    <div style={storeNameStyle}>
                                        <span style={rankStyle}>{index + 1}위</span>
                                        {store.name}
                                    </div>
                                    <div style={storeInfoStyle}>
                                        클린지수 {store.cleanIndex}점 | {store.issue}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={emptyStyle}>검색 결과가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 스타일 영역 ---

const pageStyle = { width: '100vw', height: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #ddd', zIndex: 10 };
const logoBtnStyle = { backgroundColor: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#333' };
const navBtnStyle = { backgroundColor: 'transparent', border: 'none', padding: '8px 10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#444' };
const btnStyle = { backgroundColor: 'transparent', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', color: '#444' };
const adminBtnStyle = { ...btnStyle, color: 'red', borderColor: 'red', fontWeight: 'bold' };
const profileTextStyle = { fontSize: '14px', fontWeight: 'bold', color: '#333' }; // 색상을 좀 더 깔끔하게 진한 회색(#333)으로 변경했어!

// 💡 [추가됨] 동그란 프로필을 만드는 핵심 CSS
const profileCircleStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%', // 완전한 동그라미!
    overflow: 'hidden',  
    border: '1px solid #eee',
    backgroundColor: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const contentStyle = { display: 'flex', flex: 1, overflow: 'hidden' };
const mapContainerStyle = { flex: 1, position: 'relative', backgroundColor: '#e9ecef' };

const sidebarStyle = { width: '400px', backgroundColor: '#ffffff', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' };
const sidebarHeaderAreaStyle = { padding: '20px', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa' };
const sidebarSearchInputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '14px' };

const listContainerStyle = { overflowY: 'auto', flex: 1 };
const listItemStyle = { padding: '20px', borderBottom: '1px solid #eee', cursor: 'pointer' };
const storeNameStyle = { fontSize: '16px', fontWeight: 'bold' };
const rankStyle = { color: '#007AFF', marginRight: '8px' };
const storeInfoStyle = { fontSize: '14px', color: '#666', marginTop: '4px' };
const emptyStyle = { padding: '24px', color: '#777', fontSize: '14px', textAlign: 'center' };

const popupStyle = { position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 20, width: '320px', display: 'flex', flexDirection: 'column' };
const closeIconBtnStyle = { backgroundColor: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#999' };
const infoRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px dashed #eee' };
const infoLabelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#777' };
const tagStyle = { backgroundColor: '#f0f4f8', color: '#007AFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' };
const detailBtnStyle = { width: '100%', padding: '12px', marginTop: '16px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };

const fabStyle = { position: 'absolute', top: '24px', left: '24px', width: '100px', height: '40px', backgroundColor: '#ffffff', color: 'black', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 15 };

export default Home;
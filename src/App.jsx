import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 우리가 만든 화면(컴포넌트)들을 모두 불러오기!
import Home from './Home';             // 방금 만든 메인 화면
import Login from './Login';           // 예전에 만든 카카오 로그인 버튼 화면
import AuthHandler from './AuthHandler'; // 카카오 로그인 통신 처리 화면
import ServiceIntro from './ServiceIntro';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* 1. 기본 메인 주소 (/)로 들어오면 방금 만든 Home 화면 띄우기! */}
                <Route path="/" element={<Home />} />

                <Route path="/login" element={<Login />} />
                
                {/* 2. 주소 뒤에 /login을 치고 들어오면 로그인 화면 띄우기! */}
                <Route path="/kakao/auth-code" element={<AuthHandler />} />
                
                {/* 3. 백엔드와 통신하는 카카오 콜백 주소 */}
                <Route path="/kakao/callback" element={<AuthHandler />} />

                <Route path="/intro" element={<ServiceIntro />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
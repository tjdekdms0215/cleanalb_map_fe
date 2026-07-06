import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const AuthHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const code = new URL(window.location.href).searchParams.get("code");

        const sendCodeToBackend = async () => {
            if(code) {
                try {
                    console.log("kakaoLogin code:", code);

                    const response = await fetch(`https://cleanalb-map.duckdns.org/api/kakao/callback?code=${code}`);
                    const data = await response.json();

                    console.log("backend response success", data);

                    const userEmail = data.userEmail;
                    const userNickname = data.nickname;
                    const userRole = data.role;

                    localStorage.setItem("jwt_token", data.token);
                    localStorage.setItem("user_email", userEmail);
                    localStorage.setItem("user_nickname", userNickname);
                    localStorage.setItem("user_role", userRole); // ✨ 2. 금고에 권한 정보 보관!

                    alert(`${userNickname}님, 환영합니다.`);
                    navigate("/");

                } catch (error) {
                    console.error("kakaologin error", error);
                    alert("kakaologin Failed");
                    navigate("/");
                }
            }
        };

        sendCodeToBackend();
    }, [navigate]);
    
    return(
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
            <h2>잠시만 기다려 주세요! 로그인 중입니다.</h2>
        </div>
    );
};

export default AuthHandler;
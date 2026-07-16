// src/api/axios.js (또는 통신을 설정하는 파일)
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL, // 프로젝트 기본 API 주소
    headers: {
        'Content-Type': 'application/json',
    },
});

// 1. 요청(Request) 인터셉터: 모든 API 요청 시 로컬스토리지의 토큰을 헤더에 담습니다.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. 응답(Response) 인터셉터: 401(권한 없음/토큰 만료) 에러 발생 시 토큰을 갱신합니다.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 아직 재시도를 하지 않은 요청이라면
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // 토큰 갱신 API 호출 (실제 백엔드 URL로 변경해주세요)
                const refreshResponse = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
                    {},
                    { withCredentials: true } // 보통 Refresh Token은 httpOnly 쿠키에 담겨 있으므로 필수
                );

                // 명세서에 맞춰 새 토큰 추출 (response.data.token)
                const newToken = refreshResponse.data.token;

                // 새 토큰을 로컬 스토리지에 저장
                localStorage.setItem('jwt_token', newToken);

                // 실패했던 원래 요청의 헤더를 새 토큰으로 교체 후 재시도
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                // 토큰 갱신마저 실패하면 완전 로그아웃 처리
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_nickname');
                localStorage.removeItem('user_role');
                window.location.href = '/'; // 로그인 페이지나 메인으로 튕겨냄
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
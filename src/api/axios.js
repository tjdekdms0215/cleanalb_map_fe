import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'https://cleanalb-map.duckdns.org';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');

    // 공개 API에서는 Authorization을 보내지 않음
    if (token && config.useAuth !== false) {
        config.headers.Authorization =
            `Bearer ${token}`;
    }

    // 데이터가 있는 요청에만 JSON Content-Type 설정
    if (
        config.data &&
        !(config.data instanceof FormData) &&
        !config.headers['Content-Type']
    ) {
        config.headers['Content-Type'] =
            'application/json';
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest?._retry &&
            originalRequest?.useAuth !== false
        ) {
            originalRequest._retry = true;

            try {
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/api/auth/refresh`,
                    {},
                    {
                        withCredentials: true
                    }
                );

                const newToken =
                    refreshResponse.data.token;

                localStorage.setItem(
                    'jwt_token',
                    newToken
                );

                originalRequest.headers.Authorization =
                    `Bearer ${newToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_nickname');
                localStorage.removeItem('user_role');

                window.location.href = '/';

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axios;
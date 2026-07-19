import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import AuthHandler from './AuthHandler';
import Guide from './pages/Guide';
import ReviewSelect from './pages/ReviewSelect';
import ReviewWrite from './pages/ReviewWrite';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import WorkspaceDetail from './pages/WorkspaceDetail';
import AdminPage from './pages/AdminPage';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />

                <Route
                    path="/kakao/auth-code"
                    element={<AuthHandler />}
                />

                <Route
                    path="/kakao/callback"
                    element={<AuthHandler />}
                />

                <Route
                    path="/guide"
                    element={<Guide />}
                />

                <Route
                    path="/detail/:workspaceId"
                    element={<WorkspaceDetail />}
                />

                <Route
                    path="/workspaces/:workspaceId"
                    element={<WorkspaceDetail />}
                />

                <Route
                    path="/review/select"
                    element={<ReviewSelect />}
                />

                <Route element={<RequireAdmin />}>
                    <Route
                        path="/admin"
                        element={<AdminPage />}
                    />
                </Route>

                <Route element={<RequireAuth />}>
                    <Route
                        path="/review/write"
                        element={<ReviewWrite />}
                    />

                    <Route
                        path="/review/write/new"
                        element={<ReviewWrite />}
                    />

                    <Route
                        path="/review/write/:workspaceId"
                        element={<ReviewWrite />}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;

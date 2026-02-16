import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import { store } from './app/store';
import { logout, setCredentials } from './features/auth/authSlice';
import { setupApiInterceptors } from './lib/apiClient';
import './index.css';

setupApiInterceptors({
  getAccessToken: () => store.getState().auth.accessToken,
  onRefreshSuccess: (data) => {
    store.dispatch(
      setCredentials({
        accessToken: data?.accessToken,
        role: data?.role,
      }),
    );
  },
  onAuthFail: () => {
    store.dispatch(logout());
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <ToastContainer position="top-right" autoClose={2500} />
    </Provider>
  </StrictMode>,
);

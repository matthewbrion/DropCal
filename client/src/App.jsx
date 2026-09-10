import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

function RegisterPage() {
  return <div>Register page</div>;
}

function LoginPage() {
  return <div>Login page</div>;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>
  }
  return (
    <Routes>
      <Route path='/register' element={<RegisterPage />} />
      <Route path='/login' element={<LoginPagePage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
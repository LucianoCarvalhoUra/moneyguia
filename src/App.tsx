// App.tsx - VERSÃO MÍNIMA PARA TESTE
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function TestAuth() {
  return <div className="p-8 text-center"><h1>Tela de Login</h1><p>Rota /auth funcionando!</p></div>;
}

function TestLanding() {
  return <div className="p-8 text-center"><h1>MoneyGuia Landing</h1><p>Bem-vindo ao MoneyGuia!</p></div>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<TestAuth />} />
    <Route path="/" element={<TestLanding />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;

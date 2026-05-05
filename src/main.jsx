import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './lib/AuthProvider'
import ListPage from './pages/ListPage'
import DetailPage from './pages/DetailPage'
import RegisterPage from './pages/RegisterPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/edit/:id" element={<RegisterPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import HomePage from './pages/HomePage/HomePage';
import LearnPage from './pages/LearnPage/LearnPage';
import QuizPage from './pages/QuizPage/QuizPage';
import ListeningPage from './pages/ListeningPage/ListeningPage';
import VocabularyPage from './pages/VocabularyPage/VocabularyPage';
import CollectionPage from './pages/CollectionPage/CollectionPage';
import AboutPage from './pages/AboutPage/AboutPage';
import AdminPage from './pages/AdminPage/AdminPage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="listening" element={<ListeningPage />} />
        <Route path="vocabulary" element={<VocabularyPage />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
};

export default RoutesComponent;

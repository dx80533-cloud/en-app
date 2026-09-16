import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = (): React.ReactElement => {
  return (
    <div className="page-enter flex flex-col items-center justify-center py-24 text-center">
      <div className="text-7xl font-black text-primary mb-4">404</div>
      <h1 className="text-2xl font-bold text-foreground mb-2">找不到這個頁面</h1>
      <p className="text-muted-foreground mb-6">你想要的頁面可能已經搬家了。</p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        回首頁
      </Link>
    </div>
  );
};

export default NotFound;

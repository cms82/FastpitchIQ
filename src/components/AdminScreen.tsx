import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, AlertCircle } from 'lucide-react';
import AdminScenarioManager from './AdminScenarioManager';
import AdminPlayerManager from './AdminPlayerManager';

type AdminTab = 'players' | 'scenarios';

// Check if running in production (Cloudflare Pages)
// Block admin panel if not running on localhost (production deployment)
const isProduction = () => {
  const hostname = window.location.hostname;
  // Only allow on localhost/127.0.0.1 (local development)
  // Block on any other domain (production Cloudflare Pages)
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

export default function AdminScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('scenarios');
  const [isProd, setIsProd] = useState(false);

  useEffect(() => {
    if (isProduction()) {
      setIsProd(true);
      // Redirect to home after a moment
      setTimeout(() => navigate('/'), 2000);
    }
  }, [navigate]);

  // Block access in production
  if (isProd) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-semibold text-card-foreground">Admin Panel Not Available</h1>
          <p className="text-muted-foreground">
            The admin panel is only available in development mode. This feature is not accessible in production.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 pb-safe">
        <div className="py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-card-foreground">Admin Panel</h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'scenarios'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Scenario Management
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'players'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Player Management
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'scenarios' && (
            <AdminScenarioManager />
          )}

          {activeTab === 'players' && (
            <AdminPlayerManager />
          )}
        </div>
      </div>
    </div>
  );
}

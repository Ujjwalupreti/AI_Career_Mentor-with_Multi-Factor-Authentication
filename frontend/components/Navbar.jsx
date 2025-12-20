import React, { useState } from 'react';
import { Target, Home, Route, BookOpen, LogOut, Menu, ChevronRight, Sparkles } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileCard from './dashboard/ProfileCard';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/pathbuilder', label: 'Path Builder', icon: Route },
    { to: '/learning', label: 'Learning Hub', icon: BookOpen }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {profileOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setProfileOpen(false)}></div>
          <div className="w-full max-w-md relative z-10" onClick={(e) => e.stopPropagation()}>
             <ProfileCard onClose={() => setProfileOpen(false)} />
          </div>
        </div>
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#F7F7F8] shadow border-r border-gray-200/80 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full px-5 py-6">
          
          <div className="mb-8 pl-1">
            <Link to={'/'} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-gray-900/20 transition-transform group-hover:scale-105">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-gray-800 tracking-tight group-hover:text-black transition-colors">
                AI Career
              </span>
            </Link>
          </div>
         
          <nav className="flex-1 space-y-1.5">
            <div className="mb-6">
              <button 
                onClick={() => navigate('/pathbuilder')}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 text-sm font-semibold py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <Sparkles className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
                <span>New Career Path</span>
              </button>
            </div>

            <div className="px-2 pb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Main Menu</p>
            </div>
            
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                  <div
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${
                      active
                        ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-gray-200/60'
                        : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 transition-colors duration-200 ${
                        active ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          
          <div className="mt-auto pt-4 border-t border-gray-200/60">
            {user ? (
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setProfileOpen(true)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-all duration-200 group text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate font-medium">View Profile</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                 <p className="text-xs text-gray-500 mb-3">Join to save your progress</p>
                 <Link to="/login">
                  <button className="w-full py-2 px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition-colors shadow-md">
                    Sign In
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 px-4 flex items-center justify-between lg:hidden transition-all">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileOpen(true)} 
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white">
               <Target className="w-4 h-4" />
            </div>
            <span className="font-bold text-gray-900">AI Career</span>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
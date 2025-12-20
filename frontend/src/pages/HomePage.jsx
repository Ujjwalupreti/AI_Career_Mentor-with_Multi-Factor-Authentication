import React, { useState } from "react";
import { 
  Target, Route, CheckCircle, Zap, Layout, Shield, LogOut, 
  ChevronRight, Star, ArrowUpRight, Briefcase, FileText, BookOpen,
  CreditCard
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/dashboard/ProfileCard';

const GridPattern = () => (
  <svg className="absolute inset-0 -z-10 h-full w-full stroke-slate-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
    <defs>
      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M.5 40V.5H40" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" strokeWidth="0" fill="url(#grid-pattern)" />
  </svg>
);

const StatPill = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-full shadow-sm">
    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-full">
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-xs font-bold text-slate-900">{value}</span>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  </div>
);

const FeaturePreview = ({ activeTab }) => {
  const content = {
    roadmap: {
      title: "Dynamic Career Roadmaps",
      desc: "Stop guessing. We generate a week-by-week curriculum tailored to your current level and target role.",
      points: ["Gap Analysis", "Time-based milestones", "Curated Resources"],
      color: "blue"
    },
    resume: {
      title: "AI Resume Scoring",
      desc: "Upload your PDF and get instant feedback. We check for ATS compatibility, keywords, and impact metrics.",
      points: ["ATS Check", "Keyword Matching", "Formatting Fixes"],
      color: "purple"
    },
    jobs: {
      title: "Smart Job Matching",
      desc: "Don't just apply randomly. We match you with roles that fit your current skill matrix.",
      points: ["Skill-based matching", "Salary insights", "Market demand"],
      color: "green"
    }
  };

  const data = content[activeTab];

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center animate-fadeIn">
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-slate-900">{data.title}</h3>
        <p className="text-slate-600 text-lg leading-relaxed">{data.desc}</p>
        <ul className="space-y-3">
          {data.points.map((pt, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
              <CheckCircle className={`w-5 h-5 text-${data.color}-600`} /> {pt}
            </li>
          ))}
        </ul>
      </div>
      <div className={`aspect-video rounded-2xl bg-${data.color}-50 border border-${data.color}-100 flex items-center justify-center relative overflow-hidden shadow-lg`}>
        <div className="absolute inset-0 bg-white/50" />
        <div className="relative z-10 text-center">
           <div className={`w-20 h-20 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-${data.color}-600`}>
              {activeTab === 'roadmap' && <Route className="w-10 h-10" />}
              {activeTab === 'resume' && <FileText className="w-10 h-10" />}
              {activeTab === 'jobs' && <Briefcase className="w-10 h-10" />}
           </div>
           <p className={`text-${data.color}-900 font-bold`}>Analysis Complete</p>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("roadmap");

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col font-sans relative overflow-x-hidden">
      
      <GridPattern />

      
      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setProfileOpen(false)}></div>
          <div className="w-full max-w-md relative z-10" onClick={(e) => e.stopPropagation()}>
             <ProfileCard onClose={() => setProfileOpen(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">AI Career</span>
            </div>
            
            
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
                <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 transition-colors">Features</button>
                <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
                <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            </nav>
          </div>

          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                
                <button 
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 bg-white border border-slate-200 rounded-full hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                      {user?.name?.split(' ')[0] || "Account"}
                    </p>
                  </div>
                </button>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/login')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Sign In</button>
                <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8 animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> <span>v2.0 Now Live</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Accelerate your career with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI Intelligence.</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              Generate personalized learning roadmaps, analyze your resume against millions of job descriptions, and get hired faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              
              <button 
                onClick={() => navigate('/pathbuilder')} 
                className="h-14 px-8 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              >
                  Build Roadmap <ArrowUpRight className="w-5 h-5 text-blue-200" />
              </button>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="h-14 px-8 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:border-blue-300 hover:text-blue-600 hover:shadow-lg transition-all duration-200"
              >
                Analyze Resume
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Free to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> No credit card
              </div>
            </div>
          </div>

          <div className="relative animate-fadeIn delay-100">
           
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />

           
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 rotate-1 hover:rotate-0 transition-transform duration-500">
               <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Target size={20}/></div>
                     <div>
                        <div className="h-2.5 w-24 bg-slate-900 rounded mb-1.5"></div>
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                     </div>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">92 Score</div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div className="text-2xl font-bold text-slate-900 mb-1">85%</div>
                     <div className="text-xs text-slate-500 font-bold uppercase">Match Rate</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div className="text-2xl font-bold text-slate-900 mb-1">12</div>
                     <div className="text-xs text-slate-500 font-bold uppercase">Skills Gaps</div>
                  </div>
               </div>

               <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                       <div className={`w-2 h-2 rounded-full ${i===1 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                       <div className="flex-1 h-2 bg-slate-200 rounded"></div>
                       <div className="w-8 h-2 bg-slate-200 rounded"></div>
                    </div>
                  ))}
               </div>

               <div className="absolute -left-12 top-20 animate-bounce delay-700">
                  <StatPill icon={Star} value="Top 5%" label="Candidate" />
               </div>
               <div className="absolute -right-8 bottom-20 animate-bounce delay-1000">
                  <StatPill icon={Briefcase} value="Google" label="Target" />
               </div>
            </div>
          </div>
        </div>
      </section>

     
      <section id="how-it-works" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How it Works</h2>
            <p className="text-slate-500 mt-4 text-lg">Your journey from Resume to Hired in 3 steps.</p>
          </div>

          <div className="relative">
           
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 -translate-y-1/2" />
            
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { icon: FileText, title: "1. Resume Parsing", desc: "Upload your resume. Our AI extracts your skills and identifies gaps instantly." },
                { icon: Route, title: "2. Build Roadmap", desc: "Generate a personalized learning path to bridge those gaps and upskill." },
                { icon: BookOpen, title: "3. Learning Hub", desc: "Access curated resources and mock interviews to prepare for the job." }
              ].map((step, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative group hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Powerful Features</h2>
          </div>

          <div className="flex justify-center gap-4 mb-12">
            {[
              { id: "roadmap", label: "Career Roadmap" },
              { id: "resume", label: "Resume Analysis" },
              { id: "jobs", label: "Job Matching" }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg scale-105 shadow-blue-600/20" 
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200/60 min-h-[400px] flex items-center">
            <FeaturePreview activeTab={activeTab} />
          </div>
        </div>
      </section>

      
      <section id="pricing" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Simple Pricing</h2>
          <p className="text-slate-500 text-lg mb-12">We believe in accessibility. Start building your career for free.</p>
          
        
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-3xl p-10 shadow-2xl shadow-blue-900/20 max-w-md mx-auto relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-white/20 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">Limited Time</span>
            </div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-blue-100" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Early Access</h3>
              <div className="text-5xl font-extrabold mb-2">$0 <span className="text-xl font-medium text-blue-100">/mo</span></div>
              <p className="text-blue-100 mb-8">Full access to all premium features.</p>
              
              <ul className="text-left space-y-4 mb-8 max-w-xs mx-auto">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-200" /> Unlimited Resume Parses</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-200" /> AI Career Roadmaps</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-200" /> Job Matching Engine</li>
              </ul>

              <button 
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Start for Free
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
             
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-600/20"><Target size={16}/></div>
              <span className="text-xl font-bold text-slate-900">AI Career</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              Empowering developers and professionals to reach their career goals through data-driven insights and AI mentorship.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><button onClick={() => navigate('/pathbuilder')} className="hover:text-blue-600 transition-colors">Roadmap Builder</button></li>
              <li><button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 transition-colors">Resume Checker</button></li>
              <li><button onClick={() => navigate('/learning')} className="hover:text-blue-600 transition-colors">Mock Interviews</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Location</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 border-t border-slate-200 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">© 2024 AI Career Mentor. All rights reserved.</p>
          <div className="flex gap-6 text-slate-400">
             <Layout className="w-5 h-5 hover:text-blue-600 cursor-pointer transition-colors"/>
             <Shield className="w-5 h-5 hover:text-blue-600 cursor-pointer transition-colors"/>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
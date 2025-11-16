import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
  User,
  CreditCard,
  ChevronDown,
  Tag,
  Image as ImageIcon,
  MessageSquare,
  PenSquare,
  CalendarClock,
  BarChart3,
  Clock,
  Shield,
  Lightbulb,
  Link as LinkIcon,
  Menu,
  Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/language';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/seo', '/blog', '/blog?tab=opportunities']);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/', label: t.navigation.dashboard, icon: LayoutDashboard },
    { path: '/products', label: t.navigation.catalog, icon: ShoppingBag },
    { path: '/merchant', label: t.navigation.googleMerchant, icon: BarChart3 },
    { path: '/shopping', label: t.navigation.googleShopping, icon: ShoppingBag },
    { path: '/search-products', label: t.navigation.aiSearch, icon: MessageSquare },
    { 
      path: '/seo', 
      label: t.navigation.seo, 
      icon: Sparkles,
      subItems: [
        { path: '/seo?tab=products', label: t.navigation.seoSubmenu.products, icon: ShoppingBag },
        { path: '/seo?tab=collections', label: t.navigation.seoSubmenu.collections, icon: FileText },
        { path: '/seo?tab=pages', label: t.navigation.seoSubmenu.pages, icon: FileText },
        { path: '/seo?tab=articles', label: t.navigation.seoSubmenu.articles, icon: PenSquare },
        { path: '/seo?tab=alt', label: t.navigation.seoSubmenu.altImage, icon: ImageIcon },
        { path: '/seo?tab=homepage', label: t.navigation.seoSubmenu.homepage, icon: FileText },
        { path: '/seo?tab=tags', label: t.navigation.seoSubmenu.tags, icon: Tag },
        { path: '/seo?tab=automation', label: t.navigation.seoSubmenu.automation, icon: Sparkles },
        { path: '/seo?tab=audit', label: t.navigation.seoSubmenu.audit, icon: BarChart3 },
      ]
    },
    { 
      path: '/blog', 
      label: t.navigation.seoBlog, 
      icon: FileText,
      subItems: [
        { path: '/blog?tab=articles', label: t.navigation.blogSubmenu.articles, icon: PenSquare },
        { path: '/blog?tab=campaigns', label: t.navigation.blogSubmenu.campaigns, icon: CalendarClock },
        { path: '/blog?tab=opportunities', label: t.navigation.blogSubmenu.opportunities, icon: Lightbulb },
        { path: '/blog?tab=netlinking', label: t.navigation.blogSubmenu.netlinking, icon: LinkIcon },
        { path: '/blog?tab=settings', label: t.navigation.blogSubmenu.settings, icon: Settings }
      ]
    },
    { 
      path: '/chat', 
      label: t.navigation.smartChat, 
      icon: MessageSquare,
      subItems: [
        { path: '/chat', label: t.navigation.chatSubmenu.assistant, icon: MessageSquare },
        { path: '/chat-history', label: t.navigation.chatSubmenu.history, icon: CalendarClock },
        { path: '/product-source', label: t.navigation.chatSubmenu.productSource, icon: ShoppingBag },
      ]
    },
  ];

  const bottomMenuItems = [
    { path: '/dashboard', label: t.navigation.account, icon: User },
    { path: '/notification-settings', label: t.navigation.notifications, icon: Bell },
    { path: '/subscription', label: t.navigation.subscription, icon: CreditCard },
    { path: '/integration', label: t.navigation.shopify, icon: Settings },
  ];

  useEffect(() => {
    const checkAdminAndPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(data || false);

        // Get user plan
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_plan_id, subscription_status')
          .eq('id', user.id)
          .single();

        if (profile?.current_plan_id) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('name')
            .eq('id', profile.current_plan_id)
            .single();

          if (plan) {
            const planName = profile.subscription_status === 'trialing' 
              ? `${plan.name} (Trial)` 
              : plan.name;
            setUserPlan(planName);
          }
        }
      }
    };
    checkAdminAndPlan();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  // Navigation content (shared between mobile and desktop)
  const navigationContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-300/50 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                NewAI
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-2 space-y-1">
            {/* Admin Panel Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-2 font-semibold ${
                  location.pathname === '/admin'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-300/50'
                    : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 border border-orange-200'
                }`}
                title={collapsed ? 'Admin Panel' : undefined}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{t.navigation.adminPanel}</span>}
              </Link>
            )}
            
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const hasSubItems = 'subItems' in item && item.subItems;
              const isExpanded = expandedMenus.includes(item.path);
              
              return (
                <div key={item.path}>
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => toggleMenu(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/50' 
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="font-medium flex-1 text-left">{item.label}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </button>
                      {!collapsed && isExpanded && item.subItems && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-200 pl-2">
                          {item.subItems.map((subItem: any) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = location.pathname === item.path && location.search.includes(subItem.path.split('?')[1]);
                            const hasSubSubItems = 'subItems' in subItem && subItem.subItems;
                            const isSubExpanded = expandedMenus.includes(subItem.path);
                            
                            if (hasSubSubItems) {
                              return (
                                <div key={subItem.path}>
                                  <button
                                    onClick={() => toggleMenu(subItem.path)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                      isSubActive
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left">{subItem.label}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isSubExpanded && (
                                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-100 pl-2">
                                      {subItem.subItems.map((subSubItem: any) => {
                                        const SubSubIcon = subSubItem.icon;
                                        const isSubSubActive = location.pathname === item.path && location.search.includes(subSubItem.path.split('?')[1]);
                                        
                                        return (
                                          <Link
                                            key={subSubItem.path}
                                            to={subSubItem.path}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs ${
                                              isSubSubActive
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                            }`}
                                          >
                                            <SubSubIcon className="w-3 h-3 flex-shrink-0" />
                                            <span>{subSubItem.label}</span>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            
                            return (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                  isSubActive
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                              >
                                <SubIcon className="w-4 h-4 flex-shrink-0" />
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/50' 
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom Menu */}
        <div className="px-2 pb-2 space-y-1 border-t border-gray-200 pt-2">
          {!collapsed && userPlan && (
            <div className="px-3 py-2 mb-2 text-center">
              <div className="text-xs text-muted-foreground mb-1">{t.navigation.currentPlan}</div>
              <div className="px-2 py-1 bg-gradient-primary text-white rounded-md text-xs font-semibold">
                {userPlan}
              </div>
            </div>
          )}
          {!collapsed && (
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.navigation.settings}
        </div>
          )}
          {bottomMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/50' 
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer - Logout & Collapse */}
        <div className="border-t border-gray-200 p-2 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-semibold"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t.navigation.logout}</span>}
          </button>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">{t.navigation.collapse}</span>
              </>
            )}
          </button>
        </div>
    </div>
  );

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-white shadow-md">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {navigationContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-50 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {navigationContent}
    </aside>
  );
}

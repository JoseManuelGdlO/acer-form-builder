import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  const { user, company, logout } = useAuth();
  const { tenant } = useTenant();
  const companyName = company?.name || tenant?.company?.name || 'Compañía';
  const logoUrl = company?.logoUrl ?? tenant?.company?.logoUrl ?? null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const childrenArray = React.Children.toArray(children);

  return (
    <div className="border-b border-border/50 bg-card shadow-sm sticky top-0 z-50">
      <div className="max-w-[88rem] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Mobile/Tablet Layout (≤768px) */}
        <div className="flex items-center justify-between py-2 md:hidden gap-2">
          {/* Logo and Hamburger Menu - Mobile */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            {/* Hamburger Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt={companyName} className="h-8 w-auto" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{companyName}</span>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-primary leading-none truncate">{companyName}</h2>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {/* Navigation Buttons */}
                  <nav className="flex flex-col gap-1">
                    {childrenArray.map((child, index) => {
                      // Clone the child element and modify to show text in mobile menu
                      if (React.isValidElement(child)) {
                        // Recursively clone and modify all children to show text
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const cloneWithText = (element: React.ReactElement): React.ReactElement => {
                          const children = React.Children.map(element.props.children, (childEl) => {
                            if (React.isValidElement(childEl)) {
                              // If it's a span with "hidden sm:inline", make it always visible
                              const childProps = childEl.props as { className?: string };
                              if (childEl.type === 'span' && childProps.className?.includes('hidden sm:inline')) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                return React.cloneElement(childEl as React.ReactElement, {
                                  className: childProps.className.replace('hidden sm:inline', 'inline'),
                                });
                              }
                              // Recursively process nested children
                              return cloneWithText(childEl as React.ReactElement);
                            }
                            return childEl;
                          });

                          const elementProps = element.props as { className?: string };
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          return React.cloneElement(element as React.ReactElement, {
                            className: `${elementProps.className || ''} w-full justify-start h-auto py-3`,
                            children: children,
                          });
                        };

                        return (
                          <div 
                            key={index} 
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-full"
                          >
                            {cloneWithText(child as React.ReactElement)}
                          </div>
                        );
                      }
                      return (
                        <div key={index} onClick={() => setMobileMenuOpen(false)} className="w-full">
                          {child}
                        </div>
                      );
                    })}
                  </nav>
                  
                  {/* User Info and Logout */}
                  {user && (
                    <>
                      <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex flex-col space-y-2 px-2">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 mt-2 w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo - Mobile */}
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-8 w-auto flex-shrink-0" />
            ) : (
              <span className="text-sm font-bold text-primary truncate">{companyName}</span>
            )}
            <div className="hidden min-[360px]:block min-w-0">
              <h1 className="text-sm font-bold text-primary leading-none truncate">{companyName}</h1>
            </div>
          </div>
          
          {/* User Menu - Mobile (Icon only, menu in hamburger) */}
          {user && (
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Desktop Layout (>768px) */}
        <div className="hidden md:block">
          {/* Single Row Layout (>1280px) */}
          <div className="hidden xl:flex items-center justify-between py-2.5 gap-3">
            {/* Logo and Brand - espacio reservado para que no se solape */}
            <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0 max-w-[200px]">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-9 w-auto flex-shrink-0" />
              ) : (
                <span className="text-base font-bold text-primary truncate">{companyName}</span>
              )}
              <div className="min-w-0">
                <h1 className="text-base font-bold text-primary leading-none truncate">{companyName}</h1>
              </div>
            </div>
            
            {/* Navigation - Single Row, compacto */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center overflow-hidden">
              {childrenArray}
            </div>
            
            {/* User Menu */}
            {user && (
              <div className="flex-shrink-0 ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Two Row Layout (768px - 1280px) */}
          <div className="xl:hidden flex flex-col py-2.5 gap-2">
            {/* Top Row: Logo and User Menu */}
            <div className="flex items-center justify-between gap-3">
              {/* Logo */}
              <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="h-9 w-auto flex-shrink-0" />
                ) : (
                  <span className="text-base font-bold text-primary truncate">{companyName}</span>
                )}
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-primary leading-none truncate">{companyName}</h1>
                </div>
              </div>
              
              {/* User Menu */}
              {user && (
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden lg:inline">{user.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Bottom Row: Navigation Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap w-full">
              {childrenArray}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

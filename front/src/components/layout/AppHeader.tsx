import React, { useState } from 'react';
import saruLogo from '@/assets/saru-logo.png';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const childrenArray = React.Children.toArray(children);
  const firstRow = childrenArray.slice(0, 4);
  const secondRow = childrenArray.slice(4);

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
                    <img 
                      src={saruLogo} 
                      alt="Saru Visas" 
                      className="h-8 w-auto"
                    />
                    <div>
                      <h2 className="text-lg font-bold text-primary leading-none">SARU</h2>
                      <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
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
            <img 
              src={saruLogo} 
              alt="Saru Visas" 
              className="h-8 w-auto flex-shrink-0"
            />
            <div className="hidden min-[360px]:block min-w-0">
              <h1 className="text-sm font-bold text-primary leading-none truncate">SARU</h1>
              <p className="text-[10px] text-muted-foreground truncate">Visa y Pasaporte</p>
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
          {/* Single Row Layout (>1300px) */}
          <div className="hidden xl:flex items-center justify-between py-3 gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3 flex-shrink-0 min-w-[180px]">
              <img 
                src={saruLogo} 
                alt="Saru Visas" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
                <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
              </div>
            </div>
            
            {/* Navigation - Single Row */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
              {childrenArray}
            </div>
            
            {/* User Menu */}
            {user && (
              <div className="flex-shrink-0 ml-4">
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

          {/* Two Row Layout (768px - 1300px) */}
          <div className="xl:hidden flex flex-col py-3 gap-3">
            {/* Top Row: Logo and User Menu */}
            <div className="flex items-center justify-between gap-4">
              {/* Logo */}
              <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
                <img 
                  src={saruLogo} 
                  alt="Saru Visas" 
                  className="h-10 w-auto flex-shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-primary leading-none truncate">SARU</h1>
                  <p className="text-xs text-muted-foreground truncate">Visa y Pasaporte</p>
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

            {/* Bottom Row: Navigation Buttons - Two Rows */}
            <div className="flex flex-col gap-2 w-full">
              {/* First Row: First 4 elements */}
              <div className="flex items-center gap-2 flex-wrap nav-row-1">
                {firstRow}
              </div>
              {/* Second Row: Last 3 elements */}
              {secondRow.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap nav-row-2">
                  {secondRow}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

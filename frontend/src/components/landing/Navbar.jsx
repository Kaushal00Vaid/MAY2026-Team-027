import {
  Navbar as AceternityNavbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const navItems = [
    { name: "Platform", link: "#platform" },
    { name: "Modules", link: "#modules" },
    { name: "Workflow", link: "#workflow" },
    { name: "Pricing", link: "#pricing" },
    { name: "FAQ", link: "#faq" },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <AceternityNavbar>
        {/* Desktop Navigation */}
        <NavBody>
          <div className="flex items-center space-x-2 mr-4 relative z-20">
            <a href="#top" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-primary grid place-items-center shadow-[0_6px_20px_-6px_hsl(24_95%_53%/0.6)]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 21V9l9-6 9 6v12" strokeLinejoin="round" />
                  <path d="M9 21v-8h6v8" />
                </svg>
              </div>
              <div className="leading-tight min-w-0 hidden sm:block">
                <div className="text-sm font-extrabold tracking-tight truncate">SocietySync</div>
              </div>
            </a>
          </div>
          <NavItems items={navItems} />
          <div className="flex items-center gap-4 relative z-20">
            <Link to="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <NavbarButton as={Link} to="/signup" variant="primary">Get started</NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <a href="#top" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-primary grid place-items-center shadow-[0_6px_20px_-6px_hsl(24_95%_53%/0.6)]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 21V9l9-6 9 6v12" strokeLinejoin="round" />
                  <path d="M9 21v-8h6v8" />
                </svg>
              </div>
              <div className="text-sm font-extrabold tracking-tight truncate">SocietySync</div>
            </a>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          </MobileNavHeader>

          <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300">
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-4 mt-4">
              <Link to="/signin" className="w-full text-center px-4 py-2 bg-transparent text-black dark:text-white border border-border rounded-md font-bold" onClick={() => setIsMobileMenuOpen(false)}>
                Sign in
              </Link>
              <NavbarButton
                as={Link}
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full">
                Get started
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </AceternityNavbar>
    </div>
  );
}

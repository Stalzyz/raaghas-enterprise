"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AIChatBubble } from "@/components/ai/AIChatBubble";
import { PromotionPopup } from "./PromotionPopup";
import PageTransition from "@/components/ui/PageTransition";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileBottomDock } from "./MobileBottomDock";
import { BackToTopFAB } from "../ui/BackToTopFAB";

export function StorefrontShell({ 
  children, 
  settings, 
  theme,
  mainMenu, 
  shopMenu, 
  helpMenu, 
  brandMenu 
}: { 
  children: React.ReactNode;
  settings: any;
  theme: any;
  mainMenu: any;
  shopMenu: any;
  helpMenu: any;
  brandMenu: any;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up" || pathname?.startsWith("/sign-in/") || pathname?.startsWith("/sign-up/");

  if (isAuthPage) {
    return (
      <main className="flex-1 flex flex-col">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    );
  }

  return (
    <>
      <Header settings={settings} theme={theme} menu={mainMenu} />
      <main className="flex-1 flex flex-col pt-[68px] md:pt-[200px] pb-16 md:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <Footer 
        settings={settings} 
        theme={theme}
        shopMenu={shopMenu} 
        helpMenu={helpMenu} 
        brandMenu={brandMenu} 
      />
      <MobileBottomDock />
      <BackToTopFAB />
      {settings.aiAssistantEnabled && <AIChatBubble />}
      <PromotionPopup config={theme.popupConfig} />
      <CartDrawer />
    </>
  );
}

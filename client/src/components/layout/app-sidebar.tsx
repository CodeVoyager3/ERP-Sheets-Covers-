"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  PackageIcon,
  ShoppingCartIcon,
  LayersIcon,
  FactoryIcon,
  WalletIcon,
  UserGroupIcon,
} from "@/lib/hugeicons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/auth-provider";

const NAV = [
  { title: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { title: "Products", href: "/products", icon: PackageIcon },
  { title: "Orders", href: "/orders", icon: ShoppingCartIcon },
  { title: "Inventory", href: "/inventory", icon: LayersIcon },
  { title: "Production", href: "/production", icon: FactoryIcon },
  { title: "Finance", href: "/finance", icon: WalletIcon, ownerOnly: true },
  { title: "Users & Activity", href: "/users", icon: UserGroupIcon, ownerOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = NAV.filter((item) => !item.ownerOnly || user?.role === "OWNER");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <HugeiconsIcon icon={PackageIcon} size={18} />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">SheetCover ERP</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Manufacturing Suite
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} size={18} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-muted-foreground px-3 py-2 text-xs group-data-[collapsible=icon]:hidden">
          Signed in as{" "}
          <span className="text-foreground font-medium">{user?.name}</span>
          <span className="block">{user?.role}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

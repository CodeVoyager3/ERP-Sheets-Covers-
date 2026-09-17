import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";

export const metadata: Metadata = {
  title: "Sheets & Covers ERP — Run your manufacturing business",
};

export default function HomePage() {
  return <Hero />;
}

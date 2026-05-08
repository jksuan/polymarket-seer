import { notFound } from "next/navigation";

export default function TestingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";
  const testRoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_ROUTES === "true";

  if (isProduction && !testRoutesEnabled) {
    notFound();
  }

  return <>{children}</>;
}

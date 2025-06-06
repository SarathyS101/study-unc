// components/GradientBox.tsx
export default function GradientBox({
  children,
  variant = "default", // "login" or "default"
}: {
  children: React.ReactNode;
  variant?: "login" | "default";
}) {
  const isLogin = variant === "login";

  return (
    <div
      className={`${
        isLogin
          ? "flex flex-col justify-center rounded-lg p-8 shadow-lg"
          : "min-h-screen w-full p-0"
      } bg-gradient-to-br from-[#FFFFFF] via-[#91C3E4] to-[#4B9CD3] bg-[length:200%_200%]`}
      style={{
        animation: "gradient-x 6s ease infinite",
        backgroundSize: "200% 200%",
        backgroundPosition: "0% 50%",
      }}
    >
      <style>
        {`
          @keyframes gradient-x {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
        `}
      </style>
      {children}
    </div>
  );
}

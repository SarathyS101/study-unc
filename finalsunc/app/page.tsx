"use client";

import SignUpForm from "@/components/SignUpForm";
import InfoBox from "@/components/InfoBox";
import GradientBox from "@/components/GradientBox";
export default function Page() {
  return (
    <>
      <div className="relative flex min-h-screen w-full items-center justify-center bg-gray-50 p-6 md:p-10">
        <div className="absolute top-6 left-6 text-xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-800">
          {"Study@UNC"}
        </div>
        <GradientBox variant="login">
          <div className="flex w-full max-w-4xl flex-col-reverse gap-6 md:flex-row">
            <div className="w-full md:w-1/2 flex items-center justify-center">
              <div className="w-full max-w-sm backdrop-blur-md bg-white/30 border border-white/10 shadow-md rounded-xl p-4">
                <SignUpForm />
              </div>
            </div>
            <div className="hidden w-full md:flex md:w-1/2 items-center justify-center">
              <div className="w-full max-w-sm backdrop-blur-md bg-white/30 border border-white/10 shadow-md rounded-xl p-4">
                <InfoBox />
              </div>
            </div>
          </div>
        </GradientBox>
        <footer className="absolute bottom-4 left-0 w-full text-center text-sm text-gray-500">
          <p>
            {"Made by Sarathy —"}{" "}
            <a
              href="https://www.linkedin.com/in/sarathyselvam"
              className="text-blue-600 hover:underline mx-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"LinkedIn"}
            </a>
            |
            <a
              href="https://github.com/SarathyS101"
              className="text-blue-600 hover:underline mx-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"GitHub"}
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}

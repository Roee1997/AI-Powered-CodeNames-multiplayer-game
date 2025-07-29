import React from "react";
import LoginForm from "../components/Auth/LoginForm";
import BackgroundImage from "../components/UI/BackgroundImage";
import Footer from "../components/UI/Footer";
import MainHeadLine from "../components/UI/MainHeadLine";
import codenamesImage from '../assets/codename.png';
import { Link } from "react-router-dom";

const LoginPage = () => {
  return (
      <div className="relative min-h-screen flex flex-col">
          {/* רקע */}
          <BackgroundImage image={codenamesImage} />

          {/* תוכן ממורכז */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-grow py-4">
              <MainHeadLine />
              <LoginForm />

            
          </div>

          {/* פוטר */}
          <Footer className="mt-auto" />
      </div>
  );
};

export default LoginPage;
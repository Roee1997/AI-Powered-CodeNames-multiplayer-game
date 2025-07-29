import React from 'react';
import BackgroundImage from "../components/UI/BackgroundImage";
import Footer from "../components/UI/Footer";
import Register from '../components/Auth/RegisterForm';
import MainHeadLine from "../components/UI/MainHeadLine";
import codenamesImage from '../assets/codename.png';

const RegisterPage = () => {
    return (
        <div className="relative min-h-screen flex flex-col">
          {/* רקע */}
          <BackgroundImage image={codenamesImage} />

          {/* תוכן ממורכז */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-grow py-4">
            <MainHeadLine />
            <Register/>
          </div>

          {/* פוטר */}
          <Footer className="mt-auto" />
        </div>
  );
};

export default RegisterPage;
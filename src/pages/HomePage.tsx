import PageMeta from '@/components/seo/PageMeta'
import Splash from '@/components/splash/Splash'
import DesktopSection from '@/components/sections/home/DesktopSection'
import FeaturesSection from '@/components/sections/home/FeaturesSection'
import HeroSection from '@/components/sections/home/HeroSection'
import SignInSection from '@/components/sections/home/SignInSection'
import SportsSection from '@/components/sections/home/SportsSection'

export default function HomePage() {
  return (
    <>
      <PageMeta />
      <Splash />
      <HeroSection />
      <FeaturesSection />
      <SportsSection />
      <DesktopSection />
      <SignInSection />
    </>
  )
}

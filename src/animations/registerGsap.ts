import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

let registered = false

/** Registers GSAP plugins once. Every animation gets gsap from here so they share one setup. */
export function registerGsap(): typeof gsap {
  if (!registered) {
    gsap.registerPlugin(Flip, ScrollTrigger, SplitText, useGSAP)
    registered = true
  }
  return gsap
}

export { Flip, gsap, ScrollTrigger, SplitText }

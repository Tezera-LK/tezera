"use client"

import Image from "next/image";
import purpose from "@/content/landing/purpose.json";
import "./Purpose.css"

export default function Purpose() {
  return (
    <div className="purpose">
      <div className="purpose-vission">
        <div className="purpose-header">
          <Image
            src={purpose.vision.img}
            alt=""
            width={100}
            height={100}
            className="purpose-img"
          />
          <h1>{purpose.vision.heading}</h1>
        </div>
        <h3>{purpose.vision.text}</h3>
      </div>

      <div className="purpose-mission">
        <div className="purpose-header">
          <Image
            src={purpose.mission.img}
            alt=""
            width={100}
            height={100}
            className="purpose-img"
          />
          <h1>{purpose.mission.heading}</h1>
        </div>
        <h3>{purpose.mission.text}</h3>
      </div>
    </div>
  )
}


import React from 'react';
import { cn } from "@/lib/utils";
import { Marquee } from '@/components/magicui/marquee';
import { ShineBorder } from './magicui/shine-border';


const reviews = [
    {
      name: "Samantha Figueroa",
      username: "@Samantha",
      body: "I've never seen anything like this before. It's amazing. I love it.",
      img: "https://travelplacegt.com/images/Pic-Samanta.webp",
    },
    {
      name: "Jorge Marroquín",
      username: "@jorge",
      body: "I don't know what to say. I'm speechless. This is amazing.",
      img: "https://travelplacegt.com/images/Pic-Jorge.webp",
    },
    {
      name: "Luz Rosales",
      username: "@luz",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://travelplacegt.com/images/Pic-Luz.webp",
    },
    {
      name: "Astrid Avilés",
      username: "@jane",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/jane",
    },
    {
      name: "Damariz Pérez",
      username: "@jenny",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/jenny",
    },
    {
      name: "Blas Calix",
      username: "@james",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/james",
    },
    {
        name: "Juan López",
        username: "@juan",
        body: "I'm at a loss for words. This is amazing. I love it.",
        img: "https://avatar.vercel.sh/james",
      },
  ];
   
  const firstRow = reviews.slice(0, reviews.length / 2);
  const secondRow = reviews.slice(reviews.length / 2);
   
  const ReviewCard = ({
    img,
    name,
    username,
    body,
  }: {
    img: string;
    name: string;
    username: string;
    body: string;
  }) => {
    return (
      <figure
      
        className={cn(
          "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
          // light styles
          "border-purple-900/[0.1] bg-pruple-950/[.01] hover:bg-purple-950/[.05]",
          // dark styles
          "dark:border-purple-950/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
        )}
      >
         <ShineBorder shineColor={"#5b128b"} />
        <div className="flex flex-row items-center gap-2">
          <img className="rounded-full" width="80" height="80" alt="" src={img} />
          <div className="flex flex-col">
            <figcaption className="text-sm font-medium dark:text-white">
              {name}
            </figcaption>
            <p className="text-xs font-medium dark:text-white/40">{username}</p>
          </div>
        </div>
        <blockquote className="mt-2 text-sm">{body}</blockquote>
      </figure>
    );
  };
  

const TeamSection: React.FC = () => {
    return (
        
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
            <Marquee pauseOnHover className="[--duration:20s]">
                {firstRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
                ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:20s]">
                {secondRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
                ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
            </div>

    );
};

export default TeamSection;
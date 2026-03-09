import { Metadata } from 'next';

const BASE_URL = 'https://supastarter.08612345.xyz';

type Props = {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  // Use our new dynamic route to serve the image instantly, bypassing Next.js dev server static caching bugs
  const ogImageUrl = `${BASE_URL}/api/images/${id}.jpg`;

  return {
    title: 'PolyBet 决斗挑战大厅',
    description: '有人向你发起了真实预测对赌挑战！是一个男人就进来应战！',
    openGraph: {
      title: 'PolyBet 决斗挑战大厅',
      description: '有人向你发起了真实预测对赌挑战！是一个男人就进来应战！',
      images: [
        {
          url: ogImageUrl,
          width: 1200, // Standard Twitter/OG 1.91:1 ratio width
          height: 630,  // Standard Twitter/OG 1.91:1 ratio height
          alt: 'PolyBet Challenge Poster',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image', // This tells Twitter to show a LARGE image attachment
      title: 'PolyBet 决斗挑战大厅',
      description: '有人向你发起了真实预测对赌挑战！是一个男人就进来应战！',
      images: [ogImageUrl],
    },
  };
}

// When a real human or Twitter crawler visits this page
export default async function ChallengeRedirectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  
  // Reconstruct query parameters to pass back to homepage
  const queryParams = new URLSearchParams();
  queryParams.set("challengeId", id);
  
  if (sp.amount) queryParams.set("amount", sp.amount as string);
  if (sp.topic) queryParams.set("topic", sp.topic as string);
  
  // Return a client-side redirect so Twitter crawler stops here and reads the <head> metadata
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white">
      <p className="animate-pulse">正在进入决斗大厅...</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace("/?${queryParams.toString()}");`
        }}
      />
    </div>
  );
}

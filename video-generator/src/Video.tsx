import React from 'react';
import { AbsoluteFill, Audio, Composition, getInputProps, interpolate, OffthreadVideo, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';


interface JustContent {
	text: string,
	duration: number,
	start: number,
	audioFile: string,
	emoji: string[]
}

interface InputProps {
	content: JustContent[];
	totalDuration: number;
	backgroundVideo?: string;
	backgroundVideoDuration?: number; // Duration of background video in seconds
}

// Get props passed via CLI --props
const inputProps = getInputProps() as InputProps;

// Background video duration in seconds - set this to your actual video length
// The script will pick a random section that fits the content duration
const BACKGROUND_VIDEO_DURATION_SECONDS = 1852; // 10 minutes - adjust to your video length

export const RemotionVideo: React.FC = () => {
	const content = inputProps.content || [];
	const totalDuration = inputProps.totalDuration || 1;
	const backgroundVideo = inputProps.backgroundVideo || staticFile('minecraft-parkour.webm');
	const backgroundVideoDuration = inputProps.backgroundVideoDuration || BACKGROUND_VIDEO_DURATION_SECONDS;

	const FPS = 30;
	return (
		<>
			<Composition
				id="Main"
				component={Main}
				defaultProps={{
					content,
					backgroundVideo,
					totalDuration,
					backgroundVideoDuration
				}}
				durationInFrames={FPS * Math.max(Math.ceil(totalDuration), 1)}
				fps={FPS}
				width={1080}
				height={1920}
			/>
		</>
	);
};


const Main: React.FC<{
	content: JustContent[],
	backgroundVideo: string,
	totalDuration: number,
	backgroundVideoDuration: number
}> = ({ content, backgroundVideo, totalDuration, backgroundVideoDuration }) => {
	const { fps } = useVideoConfig();
	
	// Calculate a random starting point in the background video
	// Ensure we have enough video left to cover the content duration
	const maxStartTime = Math.max(0, backgroundVideoDuration - totalDuration - 1);
	// Use random() with a seed based on content length for reproducible results
	const randomStartTime = random(`bg-start-${content.length}`) * maxStartTime;
	const startFromFrame = Math.floor(randomStartTime * fps);
	
	return (
		<AbsoluteFill>
			{/* Background Minecraft parkour video - random section matching content duration */}
			<AbsoluteFill>
				<OffthreadVideo
					src={backgroundVideo}
					startFrom={startFromFrame}
					style={{
						width: '100%',
						height: '100%',
						objectFit: 'cover',
					}}
					muted
				/>
			</AbsoluteFill>
			
			{/* Subtle gradient overlay - darker at bottom for text readability */}
			<AbsoluteFill style={{
				background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
			}} />
			
			{/* Content sequences */}
			{
				content.map((curContent, i) => (
					<Sequence
						name={`Content ${i}`}
						key={`Content ${i}`}
						durationInFrames={Math.ceil((curContent.duration) * fps)}
						from={
							Math.floor(
								fps * content.slice(0, i)
									.reduce(
										(acc, cur) => acc + cur.duration,
										0
									)
							)
						}
					>
						<ContentSequence
							key={i}
							content={curContent}
							index={i}
							duration={(curContent.duration) * fps}
						/>
					</Sequence>
				))
			}
		</AbsoluteFill>
	)
}

type ContentProps = {
	content: JustContent,
	index: number,
	duration: number
}

const ContentSequence = (props: ContentProps) => {
	const { content, duration } = props
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()

	const opacity = (offset: number) => {
		return Math.min(
			interpolate(frame - offset, [0, 8], [0, 1]),
			interpolate(frame - offset, [duration - 8, duration], [1, 0], {
				extrapolateLeft: 'clamp'
			}),
		)
	}
	const translate = (offset: number) => spring({ frame: frame - offset, fps, to: -15, durationInFrames: 12 })

	// Text outline for readability without a background box
	const textStroke = `
		-3px -3px 0 #000,
		3px -3px 0 #000,
		-3px 3px 0 #000,
		3px 3px 0 #000,
		-3px 0 0 #000,
		3px 0 0 #000,
		0 -3px 0 #000,
		0 3px 0 #000,
		0 0 20px rgba(0,0,0,0.8)
	`;

	return (
		<AbsoluteFill>
			{/* Bottom-positioned text overlay */}
			<div style={{
				position: 'absolute',
				bottom: '15%',
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: 'center',
				padding: '0 2em',
			}}>
				<p style={{
					fontSize: '3.4em',
					textAlign: 'center',
					fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif",
					fontWeight: 900,
					lineHeight: 1.3,
					margin: 0,
					color: 'white',
					textShadow: textStroke,
					maxWidth: '95%',
				}}>
					{
						content.text
							.split(' ')
							.map((word, i) => (
								<span 
									key={i}
									style={{
										display: 'inline-block',
										opacity: opacity(i),
										transform: `translateY(${translate(i)}px)`,
										marginRight: 14,
									}}
								>
									{word}
								</span>
							))
					}
				</p>
			</div>
			<Audio src={content.audioFile} />
		</AbsoluteFill>
	)
}
import React from 'react';
import { Emoji, EmojiProvider } from 'react-apple-emojis';
import { AbsoluteFill, Audio, Composition, getInputProps, Img, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import emojiData from './emoji-data.json';
import "./style.css";


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
}

var img = Img

// Get props passed via CLI --props
const inputProps = getInputProps() as InputProps;

export const RemotionVideo: React.FC = () => {
	const content = inputProps.content || [];
	const totalDuration = inputProps.totalDuration || 1;


	const FPS = 30;
	return (
		<>
			<Composition
				id="Main"
				component={Main}
				defaultProps={{
					content
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
	content: JustContent[]
}> = ({ content }) => {
	const { fps, durationInFrames } = useVideoConfig();
	return (
		<EmojiProvider data={emojiData}>
			<AbsoluteFill className='gradient-background'>
				{
					content
						.map(
							(curContent, i) => {
								return (
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
								)
							}
						)
				}
			</AbsoluteFill>
		</EmojiProvider>
	)
}

type ContentProps = {
	content: JustContent,
	index: number,
	duration: number
}

const ContentSequence = (props: ContentProps) => {
	const { content, index, duration } = props
	const frame = useCurrentFrame()
	const { fps, height, width } = useVideoConfig()

	const opacity = (offset: number) => {
		return Math.min(
			interpolate(frame - offset, [0, 10], [0, 1]),
			interpolate(frame - offset, [duration - 10, duration], [1, 0], {
				extrapolateLeft: 'clamp'
			}),
		)
	}
	const translate = (offset: number) => spring({ frame: frame - offset, fps, to: -20 })

	const factor = (index % 2 === 0 ? -1 : 1)
	const rotate = factor * random(index)
	const xMove = factor * random(index) * 20
	const yMove = factor * height / 2 * 0.3 * 0

	const emojiSize = 540 / Math.max(content.emoji.length, 1)
	const emojiDisplacement = yMove * -1 * 0
	const numWords = content.text.split(" ").length

	console.log(({
		yMove,
		emojiDisplacement
	}))

	const pt = 150
	const pr = 150

	// Filter out empty/null emoji names to prevent component errors
	const validEmojis = content.emoji.filter(e => e && typeof e === 'string' && e.trim().length > 0);
	
	const EmojiComponent = () => (
		validEmojis.length > 0 ? (
			<div style={{
				display: "flex",
				justifyContent: "center",
				width: "100%",
				opacity: opacity(0),
				transform: `rotate(${-5 * rotate}deg)`,
				marginTop: '10em',
				background: 'rgba(255, 255, 255, 0.5)',
				padding: '5em',
				borderRadius: '20em',
			}}>
				{
					validEmojis.map(
						e => <Emoji key={e} name={e} width={emojiSize} />
					)
				}
			</div>
		) : null
	)
	const TextComponent = () => (
		<div style={{
			padding: "1em",
			paddingLeft: '4em',
			paddingRight: '4em',
			width: '100%',
			textAlign: "center",
			transform: `rotate(${3 * rotate}deg)`,
			background: 'black',
			color: 'white',
			borderRadius: '4em',
			opacity: opacity(0) * 0.95,
			maxWidth: "100%",
			marginTop: '10em'
		}}
		>
			<p style={{
				fontSize: '3.5em',
				textAlign: "center",
				fontFamily: "arial, sans-serif",
				fontWeight: "bold",
			}}>
				{
					content.text
						.split(' ')
						.map(
							(word, i) => (
								<span style={{
									display: 'inline-block',
									opacity: opacity(i),
									transform: `translateY(${translate(i)}px)`,
									marginLeft: 11
								}}
								>
									{word}
								</span>
							)
						)
				}
			</p>
		</div>
	)

	let ordering = [];
	if (factor > 0) {
		ordering = [
			EmojiComponent,
			TextComponent
		]
	}
	else {
		ordering = [
			TextComponent,
			EmojiComponent
		]
	}

	return (
		<AbsoluteFill>
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				marginRight: '10em',
				marginTop: '10em'
			}}>
				<div style={{
					padding: "5em"
				}}>
					{
						ordering.map(component => component())
					}
				</div>
			</div>
			<Audio src={content.audioFile} />
		</AbsoluteFill>
	)

}
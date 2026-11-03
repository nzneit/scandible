/** The subset of an engine the play page drives in both modes. */
export interface Player {
	play(): void;
	pause(): void;
	toggle(): void;
	restart(): void;
	isPlaying(): boolean;
	destroy(): void;
}

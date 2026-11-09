import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const RW = (size: number): number =>
    PixelRatio.roundToNearestPixel(size * Dimensions.get('window').width / BASE_WIDTH);

export const RH = (size: number): number =>
    PixelRatio.roundToNearestPixel(size * Dimensions.get('window').height / BASE_HEIGHT);

export const RF = (size: number): number => RW(size);

export const RS = (size: number): number =>
    PixelRatio.roundToNearestPixel((RW(size) + RH(size)) / 2);

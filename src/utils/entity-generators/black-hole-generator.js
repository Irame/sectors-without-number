import Chance from 'chance';

import { xor } from 'constants/lodash';
import { generateBlackHoleName } from 'utils/name-generator';

export const generateBlackHole = ({
  sector,
  x,
  y,
  name = generateBlackHoleName(),
  parent,
  parentEntity,
  isHidden,
} = {}) => {
  if (!sector) {
    throw new Error('Sector id must be defined to generate a black hole');
  }
  if (!x || !y) {
    throw new Error(
      'Sector coordinate must be provided to generate a black hole',
    );
  }
  if (!parent || !parentEntity) {
    throw new Error('Parent must be defined to generate a black hole');
  }

  let blackHole = { x, y, name, sector, parent, parentEntity };
  if (isHidden !== undefined) {
    blackHole = { ...blackHole, isHidden };
  }
  return blackHole;
};

export const generateBlackHoles = ({
  sector,
  parent,
  parentEntity,
  rows,
  columns,
  coordinates,
  additionalPointsOfInterest,
}) => {
  if (!additionalPointsOfInterest) {
    return { children: [] };
  }
  if (!sector) {
    throw new Error('Sector id must be defined to generate black holes');
  }
  if (!parent || !parentEntity) {
    throw new Error('Parent must be defined to generate black holes');
  }

  const chance = new Chance();
  const numHexes = rows * columns;
  const blackHoleNum =
    chance.integer({ min: 1, max: Math.max(1, Math.floor(numHexes / 40)) }) +
    Math.floor(numHexes / 45);
  const chosenCoordinates = chance.pickset(coordinates, blackHoleNum);

  return {
    coordinates: xor(coordinates, chosenCoordinates),
    children: chosenCoordinates.map(coordinate =>
      generateBlackHole({ sector, ...coordinate, parent, parentEntity }),
    ),
  };
};

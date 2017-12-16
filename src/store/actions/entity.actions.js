import { push } from 'react-router-redux';
import { mapValues, merge } from 'lodash';

import {
  configurationSelector,
  currentSectorSelector,
  entitySelector,
  sidebarEditSelector,
} from 'store/selectors/base.selectors';
import {
  getCurrentEntityType,
  getCurrentEntityId,
} from 'store/selectors/entity.selectors';
import {
  generateEntity as generateEntityUtil,
  deleteEntity as deleteEntityUtil,
} from 'utils/entity';

export const UPDATE_ENTITIES = 'UPDATE_ENTITIES';
export const UPDATE_ENTITY = 'UPDATE_ENTITY';
export const DELETE_ENTITIES = 'DELETE_ENTITIES';

export const generateEntity = (entityType, parameters) => (
  dispatch,
  getState,
) => {
  const state = getState();
  const entities = generateEntityUtil({
    entityType,
    currentSector: currentSectorSelector(state),
    configuration: configurationSelector(state),
    parameters,
  });
  dispatch({
    type: UPDATE_ENTITIES,
    entities,
  });

  const existingSector = state.entity.sector[state.sector.currentSector];
  const newSectorKeys = Object.keys(entities.sector || {});
  if (
    (!state.sector.currentSector || !existingSector) &&
    newSectorKeys.length
  ) {
    dispatch(push(`/sector/${newSectorKeys[0]}`));
  }
};

export const updateEntity = update => (dispatch, getState) => {
  const state = getState();
  dispatch({
    type: UPDATE_ENTITY,
    entityType: getCurrentEntityType(state),
    entityId: getCurrentEntityId(state),
    update,
  });
};

export const deleteEntity = () => (dispatch, getState) => {
  const state = getState();
  dispatch({
    type: DELETE_ENTITIES,
    entities: deleteEntityUtil({
      entityType: getCurrentEntityType(state),
      entityId: getCurrentEntityId(state),
      entities: entitySelector(state),
    }),
  });
};

export const saveEntityEdit = () => (dispatch, getState) => {
  const state = getState();
  const currentEntityType = getCurrentEntityType(state);
  const entityId = getCurrentEntityId(state);
  const { entity, children } = sidebarEditSelector(state);

  let createdEntities = {};
  let updatedEntities = mapValues(children, (entities, entityType) =>
    mapValues(entities, thisEntity => {
      if (thisEntity.isCreated) {
        createdEntities = merge(
          createdEntities,
          generateEntityUtil({
            entityType,
            currentSector: currentSectorSelector(state),
            configuration: configurationSelector(state),
            parameters: {
              ...thisEntity,
              parentEntity: currentEntityType,
              parent: entityId,
            },
          }),
        );
      }
      return thisEntity.isDeleted || thisEntity.isCreated
        ? undefined
        : thisEntity;
    }),
  );

  updatedEntities = merge(updatedEntities, createdEntities);
  updatedEntities = merge(updatedEntities, {
    [currentEntityType]: { [entityId]: entity },
  });

  dispatch({
    type: UPDATE_ENTITIES,
    entities: updatedEntities,
  });
};

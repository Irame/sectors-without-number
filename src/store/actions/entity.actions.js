import { push } from 'react-router-redux';
import {
  mapValues,
  merge,
  omit,
  omitBy,
  isNil,
  forEach,
  zipObject,
  pickBy,
  size,
} from 'lodash';

import { DEACTIVATE_SIDEBAR_EDIT } from 'store/actions/sidebar-edit.actions';
import { releaseSyncLock } from 'store/actions/sector.actions';
import {
  configurationSelector,
  currentSectorSelector,
  currentEntitySelector,
  currentEntityTypeSelector,
  entitySelector,
  sidebarEditSelector,
  holdKeySelector,
  hoverKeySelector,
  syncLockSelector,
  sectorSelector,
} from 'store/selectors/base.selectors';
import {
  getCurrentTopLevelEntities,
  getCurrentEntityType,
  getCurrentEntityId,
  getCurrentEntity,
} from 'store/selectors/entity.selectors';
import { isCurrentSectorSaved } from 'store/selectors/sector.selectors';

import {
  generateEntity as generateEntityUtil,
  deleteEntity as deleteEntityUtil,
  getTopLevelEntity,
} from 'utils/entity';
import { coordinatesFromKey } from 'utils/common';
import { saveEntities, deleteEntities } from 'store/api/shared';
import { InfoToast, removeToastById } from 'store/utils';
import Entities from 'constants/entities';

export const UPDATE_ENTITIES = 'UPDATE_ENTITIES';
export const DELETE_ENTITIES = 'DELETE_ENTITIES';
export const SAVE_SECTOR = 'SAVE_SECTOR';
export const UPDATE_ID_MAPPING = 'UPDATE_ID_MAPPING';

const SYNC_TOAST_ID = 'initial-sync';
const initialSyncToast = (state, dispatch) => {
  if (!isCurrentSectorSaved(state)) {
    return new Promise(resolve => {
      dispatch(
        InfoToast({
          title: 'Syncing Sector',
          message: 'Do not exit out of this web page.',
          config: {
            id: SYNC_TOAST_ID,
            options: {
              timeOut: 0,
              removeOnHover: false,
              showCloseButton: false,
              progressBar: false,
            },
          },
        }),
      );
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }
  return Promise.resolve();
};

const updateHandler = (state, dispatch, { action, mapping }, isSynced) => {
  const dispatches = [dispatch(releaseSyncLock())];
  if (isSynced) {
    dispatches.push(dispatch(removeToastById(SYNC_TOAST_ID)));
  }
  if (action) {
    dispatches.push(dispatch(action));
  }
  if (!mapping) {
    return Promise.all(dispatches);
  }
  const currentEntity = currentEntitySelector(state);
  const currentEntityType = currentEntityTypeSelector(state);
  const entityUrl = currentEntity
    ? `/${currentEntityType}/${mapping[currentEntity] || currentEntity}`
    : '';
  return Promise.all([
    ...dispatches,
    dispatch({ type: UPDATE_ID_MAPPING, mapping }),
  ]).then(() => {
    const currentSector = currentSectorSelector(state);
    return dispatch(
      push(`/sector/${mapping[currentSector] || currentSector}${entityUrl}`),
    );
  });
};

export const generateEntity = (entity, parameters) => (dispatch, getState) => {
  const state = getState();
  if (syncLockSelector(state)) {
    return Promise.resolve();
  }
  const entities = generateEntityUtil({
    entity,
    currentSector: currentSectorSelector(state),
    configuration: configurationSelector(state),
    parameters,
  });
  dispatch({
    type: UPDATE_ENTITIES,
    entities,
  });

  const currentSector = currentSectorSelector(state);
  const existingSector = sectorSelector(state)[currentSector];
  const newSectorKeys = Object.keys(entities.sector || {});
  if ((!currentSector || !existingSector) && newSectorKeys.length) {
    dispatch(push(`/sector/${newSectorKeys[0]}`));
  }

  if (entity.entityType !== Entities.sector.key) {
    return initialSyncToast(state, dispatch).then(isInitialSync =>
      saveEntities({ state, created: entities, entities }).then(results =>
        updateHandler(state, dispatch, results, isInitialSync),
      ),
    );
  }
  return dispatch(releaseSyncLock());
};

export const moveTopLevelEntity = () => (dispatch, getState) => {
  const state = getState();
  if (syncLockSelector(state)) {
    return Promise.resolve();
  }
  const topLevelEntities = getCurrentTopLevelEntities(state);
  const holdEntity = getTopLevelEntity(
    topLevelEntities,
    holdKeySelector(state),
  );
  const hoverKey = hoverKeySelector(state);
  const hoverEntity = getTopLevelEntity(topLevelEntities, hoverKey);
  const holdUpdate = { ...holdEntity.entity, ...coordinatesFromKey(hoverKey) };
  let entities = {
    [holdEntity.entityType]: {
      [holdEntity.entityId]: omit(holdUpdate, ['numChildren', 'type']),
    },
  };
  if (hoverEntity.entity) {
    const hoverUpdate = {
      ...omit(hoverEntity.entity, ['numChildren', 'type']),
      x: holdEntity.entity.x,
      y: holdEntity.entity.y,
    };
    entities = {
      ...entities,
      [hoverEntity.entityType]: {
        ...(entities[hoverEntity.entityType] || {}),
        [hoverEntity.entityId]: hoverUpdate,
      },
    };
  }
  return Promise.all([
    initialSyncToast(state, dispatch),
    dispatch({ type: UPDATE_ENTITIES, entities }),
  ]).then(([isInitialSync]) =>
    saveEntities({ state, updated: entities, entities }).then(results =>
      updateHandler(state, dispatch, results, isInitialSync),
    ),
  );
};

export const deleteEntity = () => (dispatch, getState) => {
  const state = getState();
  if (syncLockSelector(state)) {
    return Promise.resolve();
  }
  const entity = getCurrentEntity(state);
  const currentSector = currentSectorSelector(state);
  if (!entity.parent) {
    dispatch(push('/'));
  } else if (entity.parent === currentSector) {
    dispatch(push(`/sector/${entity.parent}`));
  } else {
    dispatch(
      push(`/sector/${currentSector}/${entity.parentEntity}/${entity.parent}`),
    );
  }
  const deleted = deleteEntityUtil({
    entityType: getCurrentEntityType(state),
    entityId: getCurrentEntityId(state),
    entities: entitySelector(state),
  });
  dispatch({
    type: DELETE_ENTITIES,
    entities: deleted,
  });
  return deleteEntities({ state, deleted }).then(results =>
    updateHandler(state, dispatch, results),
  );
};

export const saveSector = () => (dispatch, getState) => {
  const state = getState();
  if (syncLockSelector(state)) {
    return Promise.resolve();
  }
  return Promise.all([
    initialSyncToast(state, dispatch),
    dispatch({ type: SAVE_SECTOR }),
  ]).then(([isInitialSync]) =>
    saveEntities({ state }).then(results =>
      updateHandler(state, dispatch, results, isInitialSync),
    ),
  );
};

export const saveEntityEdit = () => (dispatch, getState) => {
  const state = getState();
  if (syncLockSelector(state)) {
    return Promise.resolve();
  }
  const currentEntityType = getCurrentEntityType(state);
  const currentEntityId = getCurrentEntityId(state);
  const { entity, children } = sidebarEditSelector(state);

  let createdEntities = {};
  const deletedEntities = {};
  let updatedEntities = mapValues(children, (entities, thisEntityType) =>
    omitBy(
      mapValues(
        entities,
        ({ isCreated, isDeleted, isUpdated, ...thisEntity }, thisEntityId) => {
          if (isCreated) {
            createdEntities = merge(
              createdEntities,
              generateEntityUtil({
                entity: { entityType: thisEntityType },
                currentSector: currentSectorSelector(state),
                configuration: configurationSelector(state),
                parameters: {
                  ...thisEntity,
                  parentEntity: currentEntityType,
                  parent: currentEntityId,
                },
              }),
            );
          } else if (isDeleted) {
            forEach(
              deleteEntityUtil({
                entityType: thisEntityType,
                entityId: thisEntityId,
                entities: entitySelector(state),
              }),
              (entityIdArray, deletedType) => {
                deletedEntities[deletedType] = [
                  ...(deletedEntities[deletedType] || []),
                  ...entityIdArray,
                ];
              },
            );
          }
          return isDeleted || isCreated || !isUpdated ? undefined : thisEntity;
        },
      ),
      isNil,
    ),
  );

  if (entity.isUpdated) {
    const entities = entitySelector(state);
    updatedEntities = merge(updatedEntities, {
      [currentEntityType]: {
        [currentEntityId]: {
          ...entities[currentEntityType][currentEntityId],
          ...entity,
        },
      },
    });
  }

  let allEntities = {
    ...updatedEntities,
    ...mapValues(createdEntities, (entityList, entityType) => ({
      ...entityList,
      ...(updatedEntities[entityType] || {}),
    })),
  };
  allEntities = merge(
    allEntities,
    mapValues(deletedEntities, deletedIds =>
      zipObject(deletedIds, deletedIds.map(() => null)),
    ),
  );

  const filteredUpdatedEntities = pickBy(allEntities, size);
  if (size(filteredUpdatedEntities)) {
    return Promise.all([
      initialSyncToast(state, dispatch),
      dispatch({
        type: UPDATE_ENTITIES,
        entities: filteredUpdatedEntities,
      }),
    ]).then(([isInitialSync]) =>
      saveEntities({
        state,
        entities: filteredUpdatedEntities,
        updated: updatedEntities,
        created: createdEntities,
        deleted: deletedEntities,
      }).then(results =>
        updateHandler(state, dispatch, results, isInitialSync),
      ),
    );
  }
  return Promise.all([
    dispatch({ type: DEACTIVATE_SIDEBAR_EDIT }),
    dispatch(releaseSyncLock()),
  ]);
};

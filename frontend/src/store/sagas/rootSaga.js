import { all } from 'redux-saga/effects';
import { dashboardSaga } from './dashboardSaga';
import { informationListSaga } from './informationListSaga';

/**
 * Root saga - combines all sagas
 */
export default function* rootSaga() {
  yield all([
    dashboardSaga(),
    informationListSaga(),
  ]);
}


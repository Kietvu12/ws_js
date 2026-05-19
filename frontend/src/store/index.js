import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';
import dashboardReducer from './reducers/dashboardReducer';
import informationListReducer from './reducers/informationListReducer';
import rootSaga from './sagas/rootSaga';

// Combine reducers
const rootReducer = combineReducers({
  dashboard: dashboardReducer,
  informationList: informationListReducer,
});

// Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// Create store
const store = createStore(
  rootReducer,
  applyMiddleware(sagaMiddleware)
);

// Run saga
sagaMiddleware.run(rootSaga);

export default store;


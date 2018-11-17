import ReducerFabric from '../../shared/lib/reducer/fabric.js';

export const code = 'home';

export const HOME_START = 'home.start';
export const HOME_FINISH = 'home.finish';

export const HOME_REQUEST_START = 'home.request.start';
export const HOME_REQUEST_ENDSUCCESS = 'home.request.end-success';
export const HOME_REQUEST_ENDFAILURE = 'home.request.end-failure';

export const initial = HOME_START;

export default ReducerFabric.make(
    code,
    {
        ready: false,
        loading: false,
        data: {},
    },
    {
        [HOME_FINISH]: state => ({ ...state, ready: true }),
        [HOME_REQUEST_START]: state => ({ ...state, loading: true, error: null, data: {} }),
        [HOME_REQUEST_ENDSUCCESS]: (state, payload) => ({ ...state, loading: false, error: null, data: payload }),
        [HOME_REQUEST_ENDFAILURE]: (state, payload) => ({ ...state, loading: false, error: payload, data: {} }),
    }
);

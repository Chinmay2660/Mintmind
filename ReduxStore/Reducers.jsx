import * as types from './types'
const initialState = {
    data: ''
}

const setData = (state, action) => {
    return { ...state, data: action.payload };
};

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case types.SET_DATA:
            return setData(state, action);
        default:
            return state
    }
}
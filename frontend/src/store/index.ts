import {
  combineReducers,
  configureStore,
  type UnknownAction,
} from "@reduxjs/toolkit";
import auth from "./slices/authSlice";
import workspaces from "./slices/workspaceSlice";
import teams from "./slices/teamSlice";
import channels from "./slices/channelSlice";
import messages from "./slices/messageSlice";
import dm from "./slices/dmSlice";
import notifications from "./slices/notificationSlice";
import unread from "./slices/unreadSlice";
import presence from "./slices/presenceSlice";
import files from "./slices/fileSlice";
import ui from "./slices/uiSlice";

const appReducer = combineReducers({
  auth,
  workspaces,
  teams,
  channels,
  messages,
  dm,
  notifications,
  unread,
  presence,
  files,
  ui,
});

// Signing out wipes every slice so no data leaks between accounts.
const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: UnknownAction,
) => appReducer(action.type === "auth/loggedOut" ? undefined : state, action);

export const makeStore = () => configureStore({ reducer: rootReducer });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof appReducer>;
export type AppDispatch = AppStore["dispatch"];

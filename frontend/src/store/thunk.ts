import {
  createAsyncThunk,
  type ThunkDispatch,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { errorMessage } from "@/lib/api";

type AnyDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

/**
 * Wraps createAsyncThunk so every API thunk rejects with a readable message
 * (used by forms and toasts) and can dispatch follow-up thunks.
 */
export function apiThunk<Returned, Arg = void>(
  type: string,
  run: (arg: Arg, tools: { dispatch: AnyDispatch }) => Promise<Returned>,
) {
  return createAsyncThunk<Returned, Arg, { rejectValue: string }>(
    type,
    async (arg, { dispatch, rejectWithValue }) => {
      try {
        return await run(arg, { dispatch: dispatch as AnyDispatch });
      } catch (error) {
        return rejectWithValue(errorMessage(error));
      }
    },
  );
}

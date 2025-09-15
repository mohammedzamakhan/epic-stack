import { renderHook, act } from '@testing-library/react-native'
import { useFocusManager } from '../use-focus-manager'
import { dismissKeyboard } from '../../lib/keyboard'

// Mock keyboard utils
jest.mock('../../lib/keyboard', () => ({
  dismissKeyboard: jest.fn(),
}))

describe('useFocusManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct number of refs', () => {
    const { result } = renderHook(() => useFocusManager(3))
    
    expect(result.current.refs.current).toHaveLength(3)
    expect(result.current.refs.current.every((ref: any) => ref === null)).toBe(true)
  })

  it('should set refs correctly', () => {
    const { result } = renderHook(() => useFocusManager(2))
    const mockRef = { focus: jest.fn() } as any
    
    act(() => {
      result.current.setRef(0)(mockRef)
    })
    
    expect(result.current.refs.current[0]).toBe(mockRef)
  })

  it('should focus next input', () => {
    const { result } = renderHook(() => useFocusManager(3))
    const mockRef1 = { focus: jest.fn() } as any
    const mockRef2 = { focus: jest.fn() } as any
    
    act(() => {
      result.current.setRef(0)(mockRef1)
      result.current.setRef(1)(mockRef2)
    })
    
    act(() => {
      result.current.focusNext(0)
    })
    
    expect(mockRef2.focus).toHaveBeenCalledTimes(1)
  })

  it('should dismiss keyboard when no next input', () => {
    const { result } = renderHook(() => useFocusManager(2))
    const mockRef = { focus: jest.fn() } as any
    
    act(() => {
      result.current.setRef(0)(mockRef)
    })
    
    act(() => {
      result.current.focusNext(0)
    })
    
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
  })

  it('should focus previous input', () => {
    const { result } = renderHook(() => useFocusManager(3))
    const mockRef1 = { focus: jest.fn() } as any
    const mockRef2 = { focus: jest.fn() } as any
    
    act(() => {
      result.current.setRef(0)(mockRef1)
      result.current.setRef(1)(mockRef2)
    })
    
    act(() => {
      result.current.focusPrevious(1)
    })
    
    expect(mockRef1.focus).toHaveBeenCalledTimes(1)
  })

  it('should dismiss keyboard when called', () => {
    const { result } = renderHook(() => useFocusManager(2))
    
    act(() => {
      result.current.dismissKeyboard()
    })
    
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
  })
})
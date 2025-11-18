import React from 'react'

import { Width } from '../Width'
import { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

export const Message: React.FC<{ message: SerializedEditorState }> = ({ message: _message }) => {
  return (
    <Width className="my-12" width="100">
      {/* {_message} */} message
    </Width>
  )
}
